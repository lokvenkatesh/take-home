"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { assertRole } from "@/lib/auth";
import { ALLERGENS, DIETARY } from "@/lib/listings";

export type PrefsValues = { categories: string[]; avoid: string[]; diet: string[] };
export type PrefsState = { saved?: boolean; error?: string; values?: PrefsValues } | undefined;

const schema = z.object({
  categories: z.array(z.enum(["bakery", "produce", "prepared", "dairy"])),
  avoid: z.array(z.enum(ALLERGENS)),
  diet: z.array(z.enum(DIETARY)),
});

export async function savePreferences(_prev: PrefsState, formData: FormData): Promise<PrefsState> {
  const student = await assertRole("student");
  const parsed = schema.safeParse({
    categories: formData.getAll("categories").map(String),
    avoid: formData.getAll("avoid").map(String),
    diet: formData.getAll("diet").map(String),
  });
  if (!parsed.success) return { error: "Some choices weren't recognized. Refresh and try again." };

  await db
    .update(users)
    .set({ prefCategories: parsed.data.categories, avoidAllergens: parsed.data.avoid, dietNeeds: parsed.data.diet })
    .where(eq(users.id, student.id));

  // Send back what was saved so the form shows it after React resets the form
  return { saved: true, values: parsed.data };
}
