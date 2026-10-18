"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { assertRole } from "@/lib/auth";
import { ClaimError, claimListingFor, pickUpFor, releaseFor } from "@/lib/claims";

export type ClaimState = { error?: string; lost?: boolean } | undefined;

export async function claimListing(_prev: ClaimState, formData: FormData): Promise<ClaimState> {
  const student = await assertRole("student");
  if (student.blockedAt) return { error: "Your account is blocked, so you can't claim food right now." };

  const parsed = z.uuid().safeParse(formData.get("listingId"));
  if (!parsed.success) return { error: "That listing doesn't exist." };

  let claimId: string;
  try {
    claimId = await claimListingFor(student.id, parsed.data);
  } catch (e) {
    if (e instanceof ClaimError) return { error: e.message, lost: e.kind === "taken" };
    throw e;
  }
  redirect(`/claims/${claimId}`);
}

// Shared shape for "do something to my claim, then reload the pass"
async function onMyClaim(formData: FormData, run: (studentId: string, claimId: string) => Promise<void>): Promise<ClaimState> {
  const student = await assertRole("student");
  const parsed = z.uuid().safeParse(formData.get("claimId"));
  if (!parsed.success) return { error: "That pickup doesn't exist." };

  try {
    await run(student.id, parsed.data);
  } catch (e) {
    if (e instanceof ClaimError) return { error: e.message };
    throw e;
  }
  redirect(`/claims/${parsed.data}`);
}

export async function markPickedUp(_prev: ClaimState, formData: FormData) {
  return onMyClaim(formData, pickUpFor);
}

export async function dropClaim(_prev: ClaimState, formData: FormData) {
  return onMyClaim(formData, releaseFor);
}
