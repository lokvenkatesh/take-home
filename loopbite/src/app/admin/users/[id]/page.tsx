import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, count, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { db } from "@/db";
import { announcements, claims, listings, reports, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { STATUS_LABEL, effectiveStatus } from "@/lib/listings";
import { REPORT_STATUS_LABEL, reasonLabel } from "@/lib/reports";
import { duration } from "@/lib/announcements";
import { blockUser, sendWarning, setReportStatus, unblockUser } from "@/app/actions/admin";
import { setAdminAccess } from "@/app/actions/access";
import { AppHeader } from "@/components/AppHeader";

type Params = Promise<{ id: string }>;

export default function AccountPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className="p-6">Loading…</p>}>
      <Account params={params} />
    </Suspense>
  );
}

const CLAIM_LABEL = { active: "Waiting for pickup", picked_up: "Picked up", released: "Dropped", no_show: "No-show" } as const;

async function Account({ params }: { params: Params }) {
  const admin = await requireRole("admin");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [person] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!person) notFound();
  const now = Date.now();
  const isDonor = person.role === "donor";
  const isStaff = person.role === "admin";
  const hasAdmin = isStaff || person.isAdmin;

  const reporter = alias(users, "reporter");
  const target = alias(users, "target");

  const about = await db
    .select({ r: reports, byName: reporter.name, byBusiness: reporter.businessName, title: listings.title })
    .from(reports)
    .innerJoin(reporter, eq(reporter.id, reports.reporterId))
    .leftJoin(listings, eq(listings.id, reports.listingId))
    .where(eq(reports.targetUserId, id))
    .orderBy(desc(reports.createdAt));

  const filed = await db
    .select({ r: reports, toName: target.name, toBusiness: target.businessName })
    .from(reports)
    .innerJoin(target, eq(target.id, reports.targetUserId))
    .where(eq(reports.reporterId, id))
    .orderBy(desc(reports.createdAt));

  const warnings = await db
    .select()
    .from(announcements)
    .where(and(eq(announcements.audience, "user"), eq(announcements.userId, id)))
    .orderBy(desc(announcements.createdAt));

  let stats: [string | number, string][];
  let activity: { key: string; title: string; status: string; when: Date; extra?: string | null }[];

  if (person.role === "admin") {
    const [{ n }] = await db.select({ n: count() }).from(announcements).where(eq(announcements.createdBy, id));
    stats = [[n, "posts and warnings created"]];
    activity = [];
  } else if (isDonor) {
    const ls = await db.select().from(listings).where(eq(listings.donorId, id)).orderBy(desc(listings.createdAt));
    const picked = ls.filter((l) => l.status === "picked_up");
    stats = [
      [ls.length, "listings posted"],
      [picked.length, "picked up"],
      [`${picked.reduce((s, l) => s + l.estLbs, 0)} lb`, "food rescued"],
      [about.filter((x) => x.r.status === "open").length, "open reports"],
    ];
    activity = ls.slice(0, 8).map((l) => ({
      key: l.id, title: l.title, status: STATUS_LABEL[effectiveStatus(l.status, l.expiresAt, now)], when: l.createdAt,
    }));
  } else {
    const cs = await db
      .select({ c: claims, title: listings.title, donor: users.businessName })
      .from(claims)
      .innerJoin(listings, eq(listings.id, claims.listingId))
      .innerJoin(users, eq(users.id, listings.donorId))
      .where(eq(claims.studentId, id))
      .orderBy(desc(claims.createdAt));
    const picked = cs.filter((x) => x.c.status === "picked_up").length;
    const noShows = cs.filter((x) => x.c.status === "no_show").length;
    const reliability = picked + noShows ? `${Math.round((100 * picked) / (picked + noShows))}%` : "—";
    stats = [
      [cs.length, "claims"],
      [picked, "picked up"],
      [noShows, "no-shows"],
      [reliability, "pickup reliability"],
    ];
    activity = cs.slice(0, 8).map((x) => ({
      key: x.c.id, title: x.title, status: CLAIM_LABEL[x.c.status], when: x.c.createdAt, extra: x.donor,
    }));
  }

  return (
    <>
      <AppHeader name={admin.name} role={admin.role} />
      <main className="mx-auto max-w-[1120px] px-5 py-8">
        <Link href="/admin/users" className="link">All accounts</Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">{person.businessName ?? person.name}</h1>
            <p className="mt-2 text-ink-2">
              {person.role === "admin" ? `Admin, ${person.name}` : isDonor ? `Café, run by ${person.name}` : "Student"}. {person.email}. Joined{" "}
              {person.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.
            </p>
            <p className="mt-2 flex flex-wrap gap-2">
              {hasAdmin && <span className="badge neutral">Admin access</span>}
              {person.blockedAt
                ? <span className="badge crit"><i />Blocked {duration(now - person.blockedAt.getTime())} ago</span>
                : <span className="badge fresh">Active</span>}
            </p>
          </div>
          {!hasAdmin && (
            <form action={person.blockedAt ? unblockUser : blockUser}>
              <input type="hidden" name="userId" value={person.id} />
              <button className={`btn ${person.blockedAt ? "" : "danger"}`}>{person.blockedAt ? "Unblock account" : "Block account"}</button>
            </form>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map(([value, label]) => (
            <div key={label} className="border-l-4 border-teal pl-3">
              <b className="block font-display text-3xl leading-tight">{value}</b>
              <span className="text-sm text-ink-2">{label}</span>
            </div>
          ))}
        </div>

        <section className="panel mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Access</h2>
            <p className="mt-1 max-w-2xl text-sm text-ink-2">
              {person.id === admin.id
                ? "This is your account. Another admin has to change your access."
                : isStaff
                  ? "A staff admin account. It only has admin access."
                  : person.isAdmin
                    ? `Has admin access on top of their ${isDonor ? "café" : "student"} access. Removing it keeps their ${isDonor ? "café" : "student"} access.`
                    : `Admin access lets them review reports, manage accounts and post events. They keep their ${isDonor ? "café" : "student"} access.`}
            </p>
          </div>
          {person.id !== admin.id && !isStaff && (
            <form action={setAdminAccess}>
              <input type="hidden" name="userId" value={person.id} />
              <input type="hidden" name="grant" value={person.isAdmin ? "0" : "1"} />
              <button className="btn ghost">{person.isAdmin ? "Remove admin access" : "Give admin access"}</button>
            </form>
          )}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="panel">
            <h2 className="text-xl font-bold">Reports about {isDonor ? "this café" : "this student"}</h2>
            {about.length === 0 ? (
              <p className="mt-3 text-ink-2">No reports.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {about.map(({ r, byName, byBusiness, title }) => (
                  <li key={r.id} className={`rounded-xl border border-line border-l-4 p-4 ${r.severity === "high" ? "border-l-crit" : r.severity === "medium" ? "border-l-warn" : "border-l-line"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <b>{reasonLabel(r.reason)}</b>
                      <span className={`badge ${r.status === "open" ? "crit" : "neutral"}`}>{REPORT_STATUS_LABEL[r.status]}</span>
                    </div>
                    <p className="mt-1 text-sm">{r.details}</p>
                    <p className="mt-1 text-xs text-ink-2">
                      {title ? `“${title}”, ` : ""}reported by {byBusiness ?? byName}, {duration(now - r.createdAt.getTime())} ago, {r.severity} severity
                    </p>
                    {r.status === "open" && (
                      <form action={setReportStatus} className="mt-3 flex flex-wrap gap-2">
                        <input type="hidden" name="id" value={r.id} />
                        <button name="status" value="resolved" className="btn sm">Resolve</button>
                        <button name="status" value="warned" className="btn ghost sm">Send warning</button>
                        <button name="status" value="dismissed" className="btn ghost sm">Dismiss</button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="space-y-6">
            <section className="panel">
              <h2 className="text-xl font-bold">Send a warning</h2>
              <p className="mt-1 text-sm text-ink-2">They see it as a red banner the next time they open LoopBite.</p>
              <form action={sendWarning} className="mt-3 space-y-3">
                <input type="hidden" name="userId" value={person.id} />
                <textarea name="message" rows={3} maxLength={600} className="lb-in"
                  placeholder={isDonor ? "Please keep hot food at 135°F or above until pickup." : "Please pick up food you claim, or drop it so others can have it."} />
                <button className="btn ghost">Send warning</button>
              </form>
              {warnings.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-line pt-3 text-sm">
                  {warnings.map((w) => (
                    <li key={w.id}><span className="text-ink-2">{duration(now - w.createdAt.getTime())} ago:</span> {w.body}</li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel">
              <h2 className="text-xl font-bold">Recent activity</h2>
              {activity.length === 0 ? (
                <p className="mt-3 text-ink-2">Nothing yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line text-sm">
                  {activity.map((a) => (
                    <li key={a.key} className="flex justify-between gap-3 py-2">
                      <span>
                        <b>{a.title}</b>
                        {a.extra && <span className="block text-ink-2">{a.extra}</span>}
                      </span>
                      <span className="shrink-0 text-ink-2">{a.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel">
              <h2 className="text-xl font-bold">Reports {isDonor ? "this café" : "this student"} filed</h2>
              {filed.length === 0 ? (
                <p className="mt-3 text-ink-2">None.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line text-sm">
                  {filed.map(({ r, toName, toBusiness }) => (
                    <li key={r.id} className="py-2">
                      <b>{reasonLabel(r.reason)}</b>, about{" "}
                      <Link href={`/admin/users/${r.targetUserId}`} className="link text-sm">{toBusiness ?? toName}</Link>
                      <span className="block text-ink-2">{REPORT_STATUS_LABEL[r.status]}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
