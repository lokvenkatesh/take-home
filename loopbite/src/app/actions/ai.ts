"use server";

import { assertRole } from "@/lib/auth";
import { rateLimit, tooMany } from "@/lib/rate-limit";
import { parseListingText, type Draft, type ParseSource } from "@/lib/ai/parse-listing";

export type AiFillState = { draft?: Draft; source?: ParseSource; error?: string } | undefined;

export async function aiFillListing(_prev: AiFillState, formData: FormData): Promise<AiFillState> {
  const donor = await assertRole("donor");
  const fillLimit = await rateLimit(`ai:fill:${donor.id}`, 20, 60 * 60);
  if (!fillLimit.ok) return { error: tooMany(fillLimit.retryAfterSec) };

  const text = String(formData.get("aiText") ?? "").trim();
  if (text.length < 8) return { error: "Describe the food in a few words first, like “3 trays of chicken alfredo in the warmer”." };
  if (text.length > 500) return { error: "Keep the description under 500 characters." };

  return parseListingText(text);
}
