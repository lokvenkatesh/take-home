import "server-only";
import { and, desc, eq, gt, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { announcements, dismissals } from "@/db/schema";
import type { Role } from "@/lib/session";

// Server pages can keep importing these from here
export { AUDIENCE_LABEL, KIND_LABEL, RUNS_FOR, STARTS_IN, duration } from "./announcement-options";

// Everything this person should see: live now, or (for events) starting within a week, and not dismissed
export async function announcementsFor(userId: string, role: Role) {
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const group = role === "student" ? "students" : role === "donor" ? "donors" : null;

  const rows = await db
    .select({ a: announcements })
    .from(announcements)
    .leftJoin(dismissals, and(eq(dismissals.announcementId, announcements.id), eq(dismissals.userId, userId)))
    .where(
      and(
        gt(announcements.endsAt, now),
        lte(announcements.startsAt, weekAhead),
        isNull(dismissals.id),
        or(
          eq(announcements.audience, "all"),
          group ? eq(announcements.audience, group) : undefined,
          and(eq(announcements.audience, "user"), eq(announcements.userId, userId)),
        ),
      ),
    )
    .orderBy(desc(announcements.createdAt));

  return rows.map((r) => r.a);
}
