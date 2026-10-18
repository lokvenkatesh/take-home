"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { announcements, listings, reports, users } from "@/db/schema";
import { assertRole } from "@/lib/auth";
import { reasonLabel } from "@/lib/reports";

const id = z.uuid();
const DAY = 24 * 60 * 60 * 1000;

// Refresh every admin page (dashboard, accounts, account pages)
const refresh = () => revalidatePath("/admin", "layout");

async function deliverWarning(adminId: string, userId: string, body: string) {
  await db.insert(announcements).values({
    kind: "warning",
    audience: "user",
    userId,
    title: "A warning from LoopBite",
    body,
    endsAt: new Date(Date.now() + 14 * DAY),
    createdBy: adminId,
  });
}

export async function setReportStatus(formData: FormData) {
  const admin = await assertRole("admin");
  const reportId = id.parse(formData.get("id"));
  const status = z.enum(["resolved", "warned", "dismissed"]).parse(formData.get("status"));

  const [report] = await db
    .select({ targetUserId: reports.targetUserId, reason: reports.reason, title: listings.title })
    .from(reports)
    .leftJoin(listings, eq(listings.id, reports.listingId))
    .where(and(eq(reports.id, reportId), eq(reports.status, "open")))
    .limit(1);
  if (!report) return;

  await db.update(reports).set({ status, resolvedAt: new Date() }).where(eq(reports.id, reportId));

  // A warning now actually reaches the person
  if (status === "warned") {
    await deliverWarning(
      admin.id,
      report.targetUserId,
      `We received a report: "${reasonLabel(report.reason)}"${report.title ? ` about "${report.title}"` : ""}. Please follow LoopBite's guidelines. Repeated reports can lead to your account being blocked.`,
    );
  }
  refresh();
}

export async function sendWarning(formData: FormData) {
  const admin = await assertRole("admin");
  const userId = id.parse(formData.get("userId"));
  const message = String(formData.get("message") ?? "").trim().slice(0, 600);
  await deliverWarning(
    admin.id,
    userId,
    message.length >= 10 ? message : "Please follow LoopBite's guidelines. Repeated reports can lead to your account being blocked.",
  );
  refresh();
}

export async function blockUser(formData: FormData) {
  const admin = await assertRole("admin");
  const userId = id.parse(formData.get("userId"));
  if (userId === admin.id) return;

  const [target] = await db.select({ role: users.role, isAdmin: users.isAdmin }).from(users).where(eq(users.id, userId)).limit(1);
  if (!target || target.role === "admin" || target.isAdmin) return; // remove admin access before blocking

  await db.transaction(async (tx) => {
    await tx.update(users).set({ blockedAt: new Date() }).where(eq(users.id, userId));
    await tx
      .update(reports)
      .set({ status: "blocked", resolvedAt: new Date() })
      .where(and(eq(reports.targetUserId, userId), eq(reports.status, "open")));
  });
  refresh();
}

export async function unblockUser(formData: FormData) {
  await assertRole("admin");
  const userId = id.parse(formData.get("userId"));
  await db.update(users).set({ blockedAt: null }).where(eq(users.id, userId));
  refresh();
}

/* ---------- Events, alerts and promotions ---------- */

export type AnnouncementState = { error?: string; posted?: string } | undefined;

const announcementInput = z.object({
  kind: z.enum(["event", "alert", "promo"]),
  title: z.string().trim().min(3, "Give it a title of at least 3 characters").max(100),
  body: z.string().trim().max(500),
  location: z.string().trim().max(120),
  link: z.union([z.literal(""), z.url("The link must be a full web address, starting with https://")]),
  audience: z.enum(["all", "students", "donors"]),
  startsIn: z.coerce.number().int().min(0).max(43200),
  runsFor: z.coerce.number().int().min(15).max(43200),
});

export async function createAnnouncement(_prev: AnnouncementState, formData: FormData): Promise<AnnouncementState> {
  const admin = await assertRole("admin");
  const parsed = announcementInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const d = parsed.data;
  const startsAt = new Date(Date.now() + d.startsIn * 60_000);
  await db.insert(announcements).values({
    kind: d.kind,
    title: d.title,
    body: d.body,
    location: d.location || null,
    link: d.link || null,
    audience: d.audience,
    startsAt,
    endsAt: new Date(startsAt.getTime() + d.runsFor * 60_000),
    createdBy: admin.id,
  });
  refresh();
  return { posted: d.title };
}

export async function endAnnouncement(formData: FormData) {
  await assertRole("admin");
  await db.update(announcements).set({ endsAt: new Date() }).where(eq(announcements.id, id.parse(formData.get("id"))));
  refresh();
}

export async function deleteAnnouncement(formData: FormData) {
  await assertRole("admin");
  await db.delete(announcements).where(eq(announcements.id, id.parse(formData.get("id"))));
  refresh();
}
