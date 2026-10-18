import { Suspense } from "react";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { announcements, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { AUDIENCE_LABEL, KIND_LABEL, duration } from "@/lib/announcements";
import { deleteAnnouncement, endAnnouncement } from "@/app/actions/admin";
import { AppHeader } from "@/components/AppHeader";
import { AnnouncementForm } from "@/components/AnnouncementForm";

export default function AnnouncementsPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading…</p>}>
      <AdminAnnouncements />
    </Suspense>
  );
}

async function AdminAnnouncements() {
  const admin = await requireRole("admin");
  const rows = await db
    .select({ a: announcements, toName: users.name, toBusiness: users.businessName })
    .from(announcements)
    .leftJoin(users, eq(users.id, announcements.userId))
    .orderBy(desc(announcements.createdAt));
  const now = Date.now();

  const statusOf = (a: typeof announcements.$inferSelect) =>
    a.endsAt.getTime() <= now ? "ended" : a.startsAt.getTime() > now ? "scheduled" : "live";

  const posts = rows.filter((r) => r.a.kind !== "warning");
  const warnings = rows.filter((r) => r.a.kind === "warning");

  return (
    <>
      <AppHeader name={admin.name} role={admin.role} />
      <main className="mx-auto max-w-[1120px] px-5 py-8">
        <h1 className="text-3xl font-bold md:text-4xl">Events and alerts</h1>
        <p className="mt-2 max-w-2xl text-ink-2">
          Post events, alerts and promotions. Alerts show as a banner at the top of the feed. Events and promotions
          appear under “Happening on campus.”
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <AnnouncementForm />

          <section className="panel">
            <h2 className="text-xl font-bold">All posts</h2>
            {posts.length === 0 ? (
              <p className="mt-3 text-ink-2">Nothing posted yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {posts.map(({ a }) => {
                  const s = statusOf(a);
                  return (
                    <li key={a.id} className="py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`badge ${a.kind === "alert" ? "lock" : "neutral"}`}>{KIND_LABEL[a.kind]}</span>
                        <span className={`badge ${s === "live" ? "fresh" : s === "scheduled" ? "warn" : "neutral"}`}>
                          {s === "live" ? `Live, ends in ${duration(a.endsAt.getTime() - now)}` : s === "scheduled" ? `Starts in ${duration(a.startsAt.getTime() - now)}` : "Ended"}
                        </span>
                      </div>
                      <p className="mt-2 font-semibold">{a.title}</p>
                      <p className="text-sm text-ink-2">{AUDIENCE_LABEL[a.audience]}{a.location ? `, ${a.location}` : ""}</p>
                      <div className="mt-2 flex gap-2">
                        {s !== "ended" && (
                          <form action={endAnnouncement}><input type="hidden" name="id" value={a.id} /><button className="btn ghost sm">End now</button></form>
                        )}
                        <form action={deleteAnnouncement}><input type="hidden" name="id" value={a.id} /><button className="btn danger sm">Delete</button></form>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <section className="panel mt-6">
          <h2 className="text-xl font-bold">Warnings sent</h2>
          {warnings.length === 0 ? (
            <p className="mt-3 text-ink-2">No warnings sent.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {warnings.map(({ a, toName, toBusiness }) => (
                <li key={a.id} className="py-3 text-sm">
                  <p>
                    To{" "}
                    {a.userId ? <Link href={`/admin/users/${a.userId}`} className="link text-sm">{toBusiness ?? toName}</Link> : "a deleted account"},{" "}
                    {duration(now - a.createdAt.getTime())} ago
                  </p>
                  <p className="mt-1 text-ink-2">{a.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
