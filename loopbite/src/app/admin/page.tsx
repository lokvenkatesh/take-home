import { Suspense } from "react";
import Link from "next/link";
import { desc, eq, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { listings, reports, safetyQuestions, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { REPORT_STATUS_LABEL, reasonLabel } from "@/lib/reports";
import { blockUser, setReportStatus, unblockUser } from "@/app/actions/admin";
import { AppHeader } from "@/components/AppHeader";

type SearchParams = Promise<{ status?: string; target?: string }>;
const DAY = 24 * 60 * 60 * 1000;

export default function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<p className="p-6">Loading…</p>}>
      <Admin searchParams={searchParams} />
    </Suspense>
  );
}

const ago = (d: Date, now: number) => {
  const m = Math.round((now - d.getTime()) / 60_000);
  if (m < 60) return `${Math.max(1, m)} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} hr ago` : `${Math.round(h / 24)} days ago`;
};

async function Admin({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireRole("admin");
  const params = await searchParams;
  const filter = params.status === "high" || params.status === "all" ? params.status : "open";
  const now = Date.now();

  const target = alias(users, "target");
  const reporter = alias(users, "reporter");
  const rows = await db
    .select({
      r: reports,
      targetName: target.name,
      targetBusiness: target.businessName,
      targetRole: target.role,
      targetBlocked: target.blockedAt,
      reporterName: reporter.name,
      reporterBusiness: reporter.businessName,
      listingTitle: listings.title,
    })
    .from(reports)
    .innerJoin(target, eq(target.id, reports.targetUserId))
    .innerJoin(reporter, eq(reporter.id, reports.reporterId))
    .leftJoin(listings, eq(listings.id, reports.listingId))
    .orderBy(desc(reports.createdAt));

  const blocked = await db
    .select({ id: users.id, name: users.name, businessName: users.businessName, role: users.role, blockedAt: users.blockedAt })
    .from(users)
    .where(isNotNull(users.blockedAt));

  const asked = await db
    .select({ q: safetyQuestions, name: users.name, business: users.businessName })
    .from(safetyQuestions)
    .leftJoin(users, eq(users.id, safetyQuestions.userId))
    .orderBy(desc(safetyQuestions.createdAt))
    .limit(30);
  const gaps = asked.filter((x) => !x.q.answered);

  // ---- Stats ----
  const open = rows.filter((x) => x.r.status === "open");
  const week = rows.filter((x) => now - x.r.createdAt.getTime() < 7 * DAY);
  const fixHours = rows
    .filter((x) => x.r.resolvedAt)
    .map((x) => (x.r.resolvedAt!.getTime() - x.r.createdAt.getTime()) / 3_600_000)
    .sort((a, b) => a - b);
  const median = fixHours.length ? fixHours[Math.floor(fixHours.length / 2)] : null;

  // ---- Reports per day, last 7 days ----
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, i) => {
    const start = today.getTime() - (6 - i) * DAY;
    const inDay = rows.filter((x) => x.r.createdAt.getTime() >= start && x.r.createdAt.getTime() < start + DAY);
    return {
      label: i === 6 ? "Today" : new Date(start).toLocaleDateString("en-US", { weekday: "short" }),
      total: inDay.length,
      high: inDay.filter((x) => x.r.severity === "high").length,
    };
  });
  const maxDay = Math.max(3, ...days.map((d) => d.total));

  // ---- What people report ----
  const byReason = Object.entries(
    rows.reduce<Record<string, number>>((acc, x) => ({ ...acc, [x.r.reason]: (acc[x.r.reason] ?? 0) + 1 }), {}),
  ).sort((a, b) => b[1] - a[1]);
  const maxReason = byReason[0]?.[1] ?? 1;

  // ---- Who is reported, ranked by risk ----
  type Agg = { id: string; name: string; role: string; blocked: boolean; total: number; open: number; high: number; week: number; reasons: Record<string, number> };
  const byTarget = new Map<string, Agg>();
  for (const x of rows) {
    const a = byTarget.get(x.r.targetUserId) ?? {
      id: x.r.targetUserId, name: x.targetBusiness ?? x.targetName, role: x.targetRole, blocked: !!x.targetBlocked,
      total: 0, open: 0, high: 0, week: 0, reasons: {},
    };
    a.total++;
    if (x.r.status === "open") a.open++;
    if (x.r.severity === "high") a.high++;
    if (now - x.r.createdAt.getTime() < 7 * DAY) a.week++;
    a.reasons[x.r.reason] = (a.reasons[x.r.reason] ?? 0) + 1;
    byTarget.set(x.r.targetUserId, a);
  }
  const targets = [...byTarget.values()]
    .map((a) => ({
      ...a,
      risk: a.open * 2 + a.high * 3 + a.week,
      top: Object.entries(a.reasons).sort((p, q) => q[1] - p[1])[0][0],
    }))
    .sort((a, b) => b.risk - a.risk);
  const flaggedDonors = targets.filter((t) => t.role === "donor" && t.open >= 2).length;

  // ---- Queue ----
  const queue = rows.filter(
    (x) =>
      (filter === "all" || (filter === "open" && x.r.status === "open") || (filter === "high" && x.r.severity === "high")) &&
      (!params.target || x.r.targetUserId === params.target),
  );
  const focus = params.target ? byTarget.get(params.target)?.name : null;
  const qs = (s: string, t?: string) => `/admin?status=${s}${t ? `&target=${t}` : ""}`;

  const riskBadge = (risk: number) =>
    risk >= 10 ? <span className="badge crit"><i />High risk</span> : risk >= 5 ? <span className="badge warn">Watch</span> : <span className="badge fresh">Low</span>;

  const TargetTable = ({ role, title, note }: { role: string; title: string; note: string }) => {
    const list = targets.filter((t) => t.role === role);
    return (
      <section className="panel mt-6">
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="mt-1 text-sm text-ink-2">{note}</p>
        {list.length === 0 ? (
          <p className="mt-4 text-ink-2">No reports.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-ink-2">
                <tr className="border-b border-line">
                  <th className="py-2 pr-3">Name</th><th className="pr-3">Reports</th><th className="pr-3">Open</th>
                  <th className="pr-3">Last 7 days</th><th className="pr-3">Most common issue</th><th className="pr-3">Risk</th><th />
                </tr>
              </thead>
              <tbody>
                {list.map((t) => (
                  <tr key={t.id} className="border-b border-line align-top">
                    <td className="py-3 pr-3 font-semibold"><Link href={`/admin/users/${t.id}`} className="link text-base">{t.name}</Link>{t.blocked && <><br /><span className="badge crit mt-1">Blocked</span></>}</td>
                    <td className="py-3 pr-3">{t.total}</td>
                    <td className="py-3 pr-3">{t.open}</td>
                    <td className="py-3 pr-3">{t.week}</td>
                    <td className="py-3 pr-3">
                      {reasonLabel(t.top)}
                      {t.high > 0 && <span className="block text-crit">{t.high} high severity</span>}
                    </td>
                    <td className="py-3 pr-3">{riskBadge(t.risk)}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/admin/users/${t.id}`} className="btn ghost sm">Open account</Link>
                        <form action={t.blocked ? unblockUser : blockUser}>
                          <input type="hidden" name="userId" value={t.id} />
                          <button className={`btn sm ${t.blocked ? "" : "danger"}`}>{t.blocked ? "Unblock" : "Block"}</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  };

  return (
    <>
      <AppHeader name={user.name} role={user.role} />
      <main className="mx-auto max-w-[1120px] px-5 py-8">
        <h1 className="text-3xl font-bold md:text-4xl">Trust and safety</h1>
        <p className="mt-2 text-ink-2">Reports from students and donors arrive here the moment they&apos;re sent.</p>

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">
          {[
            [open.length, "open reports"],
            [week.length, "reports in the last 7 days"],
            [flaggedDonors, "restaurants with 2+ open reports"],
            [blocked.length, "blocked accounts"],
            [median === null ? "—" : `${median.toFixed(1)} hr`, "median time to resolve"],
          ].map(([value, label]) => (
            <div key={label as string} className="border-l-4 border-teal pl-3">
              <b className="block font-display text-3xl leading-tight">{value}</b>
              <span className="text-sm text-ink-2">{label}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <section className="panel">
            <h2 className="text-xl font-bold">Reports per day</h2>
            <p className="mt-1 text-sm text-ink-2">Red shows high severity: unsafe food and missing allergens.</p>
            <div className="mt-4 flex h-40 items-end gap-3" role="img" aria-label="Reports per day for the last 7 days">
              {days.map((d) => (
                <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-sm font-bold">{d.total}</span>
                  <div className="flex w-full flex-col justify-end overflow-hidden rounded-md bg-teal/30" style={{ height: `${(d.total / maxDay) * 100}%`, minHeight: 4 }}>
                    <div className="w-full bg-crit" style={{ height: d.total ? `${(d.high / d.total) * 100}%` : 0 }} />
                  </div>
                  <span className="text-xs text-ink-2">{d.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2 className="text-xl font-bold">What people report</h2>
            <ul className="mt-4 space-y-3">
              {byReason.map(([reason, n]) => (
                <li key={reason} className="text-sm">
                  <div className="flex justify-between"><span>{reasonLabel(reason)}</span><b>{n}</b></div>
                  <div className="mt-1 h-2 overflow-hidden rounded bg-line">
                    <div className={`h-full rounded ${["unsafe", "allergen"].includes(reason) ? "bg-crit" : "bg-teal"}`} style={{ width: `${(n / maxReason) * 100}%` }} />
                  </div>
                </li>
              ))}
              {byReason.length === 0 && <li className="text-ink-2">No reports yet.</li>}
            </ul>
          </section>
        </div>

        <TargetTable role="donor" title="Restaurants by reports"
          note="Risk weighs open reports, high-severity reports and recent volume. Blocking hides a restaurant's listings and stops it from posting." />
        <TargetTable role="student" title="Students by reports" note="Blocking a student stops them from claiming food." />

        <section className="panel mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Report queue</h2>
            <div className="flex gap-1 rounded-full border border-line p-1">
              {[["open", "Open"], ["high", "High severity"], ["all", "All"]].map(([v, label]) => (
                <Link key={v} href={qs(v, params.target)}
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${filter === v ? "bg-teal text-[var(--on-teal)]" : ""}`}>{label}</Link>
              ))}
            </div>
          </div>
          {focus && (
            <p className="mt-3 text-sm">Showing reports about <b>{focus}</b>. <Link href={qs(filter)} className="link">Show everyone</Link></p>
          )}
          {queue.length === 0 ? (
            <div className="empty mt-4"><p>No reports match this filter.</p></div>
          ) : (
            <ul className="mt-4 space-y-3">
              {queue.map((x) => (
                <li key={x.r.id} className={`rounded-xl border border-line border-l-4 p-4 ${x.r.severity === "high" ? "border-l-crit" : x.r.severity === "medium" ? "border-l-warn" : "border-l-line"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link href={`/admin/users/${x.r.targetUserId}`} className="font-bold underline">{x.targetBusiness ?? x.targetName}</Link>{" "}
                      <span className="text-sm text-ink-2">{x.targetRole === "donor" ? "restaurant" : "student"}{x.listingTitle ? `, “${x.listingTitle}”` : ""}</span>
                    </div>
                    <span className={`badge ${x.r.status === "open" ? "crit" : "neutral"}`}>{REPORT_STATUS_LABEL[x.r.status]}</span>
                  </div>
                  <p className="mt-2 text-sm">
                    <b>{reasonLabel(x.r.reason)}</b>{" "}
                    <span className={x.r.severity === "high" ? "font-bold text-crit" : "text-ink-2"}>{x.r.severity} severity</span>
                  </p>
                  <p className="mt-1 text-sm">{x.r.details}</p>
                  <p className="mt-1 text-xs text-ink-2">Reported by {x.reporterBusiness ?? x.reporterName}, {ago(x.r.createdAt, now)}</p>
                  {x.r.status === "open" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <form action={setReportStatus} className="flex flex-wrap gap-2">
                        <input type="hidden" name="id" value={x.r.id} />
                        <button name="status" value="resolved" className="btn sm">Resolve</button>
                        <button name="status" value="warned" className="btn ghost sm">Send warning</button>
                        <button name="status" value="dismissed" className="btn ghost sm">Dismiss</button>
                      </form>
                      {!x.targetBlocked && (
                        <form action={blockUser}>
                          <input type="hidden" name="userId" value={x.r.targetUserId} />
                          <button className="btn danger sm">Block account</button>
                        </form>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel mt-6">
          <h2 className="text-xl font-bold">Food safety questions</h2>
          <p className="mt-1 text-sm text-ink-2">
            {asked.length === 0
              ? "Nobody has asked the safety assistant anything yet."
              : `Last ${asked.length} questions: ${asked.length - gaps.length} answered, ${gaps.length} declined. Declined questions show what guidance to add.`}
          </p>
          {gaps.length > 0 && (
            <>
              <h3 className="mt-4 font-semibold">Not covered by the library</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {gaps.map((x) => (
                  <li key={x.q.id}><span className="badge lock mr-2">Gap</span>{x.q.question} <span className="text-ink-2">({x.business ?? x.name ?? "deleted account"})</span></li>
                ))}
              </ul>
            </>
          )}
          {asked.length > gaps.length && (
            <>
              <h3 className="mt-4 font-semibold">Recently answered</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {asked.filter((x) => x.q.answered).slice(0, 8).map((x) => (
                  <li key={x.q.id}><span className="badge fresh mr-2">{x.q.topSource}</span>{x.q.question}</li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="panel mt-6">
          <h2 className="text-xl font-bold">Blocked accounts</h2>
          {blocked.length === 0 ? (
            <p className="mt-3 text-ink-2">No one is blocked.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {blocked.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3">
                  <span><Link href={`/admin/users/${b.id}`} className="font-bold underline">{b.businessName ?? b.name}</Link> <span className="text-sm text-ink-2">{b.role}, blocked {ago(b.blockedAt!, now)}</span></span>
                  <form action={unblockUser}>
                    <input type="hidden" name="userId" value={b.id} />
                    <button className="btn ghost sm">Unblock</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
