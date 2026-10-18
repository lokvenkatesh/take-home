"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { assertRole } from "@/lib/auth";
import { listingInput } from "@/lib/listings";

export type ListingFormState =
  | { error?: string; values?: Record<string, string | string[]> }
  | undefined;

export async function createListing(_prev: ListingFormState, formData: FormData): Promise<ListingFormState> {
  const donor = await assertRole("donor");
  if (donor.blockedAt) return { error: "Your account is blocked, so you can't post food right now." };

  const text = (key: string) => String(formData.get(key) ?? "");
  const list = (key: string) => formData.getAll(key).map(String);

  const values = {
    title: text("title"),
    description: text("description"),
    category: text("category"),
    quantityText: text("quantityText"),
    estLbs: text("estLbs"),
    handling: text("handling"),
    allergens: list("allergens"),
    dietary: list("dietary"),
    location: text("location"),
    pickupWithin: text("pickupWithin"),
    goodFor: text("goodFor"),
  };

  const parsed = listingInput.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };

  const d = parsed.data;
  const now = Date.now();

  await db.insert(listings).values({
    donorId: donor.id,
    title: d.title,
    description: d.description,
    category: d.category,
    quantityText: d.quantityText,
    estLbs: d.estLbs,
    handling: d.handling,
    allergens: d.allergens,
    dietary: d.dietary,
    location: d.location,
    pickupStart: new Date(now),
    pickupEnd: new Date(now + d.pickupWithin * 60_000),
    expiresAt: new Date(now + d.goodFor * 60_000),
  });

  redirect("/donor");
}
