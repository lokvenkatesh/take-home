"use server";

import { z } from "zod";
import { assertRole } from "@/lib/auth";
import { ClaimError, confirmByCodeFor, noShowFor } from "@/lib/claims";

export type PickupState = { error?: string; success?: string } | undefined;

export async function confirmPickup(_prev: PickupState, formData: FormData): Promise<PickupState> {
  const donor = await assertRole("donor");
  const code = String(formData.get("code") ?? "").trim();
  if (code.length < 4) return { error: "Enter the pickup code the student shows you." };

  try {
    const { title, studentName } = await confirmByCodeFor(donor.id, code);
    return { success: `Confirmed: ${studentName} picked up ${title}.` };
  } catch (e) {
    if (e instanceof ClaimError) return { error: e.message };
    throw e;
  }
}

export async function markNoShow(_prev: PickupState, formData: FormData): Promise<PickupState> {
  const donor = await assertRole("donor");
  const parsed = z.uuid().safeParse(formData.get("claimId"));
  if (!parsed.success) return { error: "That pickup doesn't exist." };

  try {
    const { relisted } = await noShowFor(donor.id, parsed.data);
    return { success: relisted ? "Marked as no-show. The food is back in the feed." : "Marked as no-show. The food has expired." };
  } catch (e) {
    if (e instanceof ClaimError) return { error: e.message };
    throw e;
  }
}
