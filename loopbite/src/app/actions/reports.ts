"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { claims, listings, reports } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { reasonsFor } from "@/lib/reports";

export type ReportState = { error?: string; sentId?: string } | undefined;

const input = z.object({
  listingId: z.uuid(),
  reason: z.string().min(1, "Choose what went wrong"),
  details: z.string().trim().min(10, "Add a few words about what happened (at least 10 characters)").max(1000),
});

export async function submitReport(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "student" && user.role !== "donor")) throw new Error("Forbidden");

  const parsed = input.safeParse({
    listingId: formData.get("listingId"),
    reason: formData.get("reason"),
    details: formData.get("details"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { listingId, reason, details } = parsed.data;

  const [listing] = await db.select().from(listings).where(eq(listings.id, listingId)).limit(1);
  if (!listing) return { error: "That listing doesn't exist." };

  // The server works out who is being reported. The form can't choose.
  let targetUserId: string;
  if (user.role === "student") {
    targetUserId = listing.donorId;
  } else {
    if (listing.donorId !== user.id) return { error: "You can only report students who claimed your food." };
    const [claim] = await db
      .select({ studentId: claims.studentId })
      .from(claims)
      .where(and(eq(claims.listingId, listingId), inArray(claims.status, ["active", "picked_up", "no_show"])))
      .orderBy(desc(claims.createdAt))
      .limit(1);
    if (!claim) return { error: "Nobody has claimed this listing yet." };
    targetUserId = claim.studentId;
  }

  const kind = user.role === "student" ? "food" : "student";
  const match = reasonsFor(kind).find((r) => r.value === reason);
  if (!match) return { error: "Choose what went wrong." };

  // One open report per person per listing
  const [existing] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(and(eq(reports.reporterId, user.id), eq(reports.listingId, listingId), eq(reports.status, "open")))
    .limit(1);
  if (existing) return { error: "You already reported this. An admin is reviewing it." };

  const [created] = await db
    .insert(reports)
    .values({ reporterId: user.id, targetUserId, listingId, reason, details, severity: match.severity })
    .returning({ id: reports.id });

  return { sentId: created.id };
}
