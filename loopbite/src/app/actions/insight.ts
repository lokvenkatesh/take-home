"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { listings, users } from "@/db/schema";
import { assertRole } from "@/lib/auth";
import { rateLimit, tooMany } from "@/lib/rate-limit";
import { listingInsight, type Insight } from "@/lib/ai/listing-insight";

export type InsightResult = { title: string; donor: string; insight: Insight } | { error: string };

export async function getListingInsight(listingId: string): Promise<InsightResult> {
  const student = await assertRole("student");
  const detailsLimit = await rateLimit(`ai:insight:${student.id}`, 60, 60 * 60);
  if (!detailsLimit.ok) return { error: tooMany(detailsLimit.retryAfterSec) };
  const id = z.uuid().safeParse(listingId);
  if (!id.success) return { error: "That listing doesn't exist." };

  const [row] = await db
    .select({ l: listings, donor: users.businessName })
    .from(listings)
    .innerJoin(users, eq(users.id, listings.donorId))
    .where(eq(listings.id, id.data))
    .limit(1);
  if (!row) return { error: "That listing doesn't exist anymore." };

  const [prefs] = await db
    .select({ categories: users.prefCategories, avoid: users.avoidAllergens, diet: users.dietNeeds })
    .from(users)
    .where(eq(users.id, student.id))
    .limit(1);

  const donor = row.donor ?? "the café";
  return { title: row.l.title, donor, insight: await listingInsight(row.l, donor, prefs) };
}
