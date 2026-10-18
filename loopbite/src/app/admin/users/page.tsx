import { Suspense } from "react";
import Link from "next/link";
import { count, sql } from "drizzle-orm";
import { db } from "@/db";
import { claims, listings, reports, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { CreateAccountForm } from "@/components/CreateAccountForm";

type SearchParams = Promise<{ role?: string }>;

export default function AccountsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<p className="p-6">Loading…</p>}>
      <Accounts searchParams={searchParams} />
    </Suspense>
  );
}

async function Accounts({ searchParams }: { searchParams: SearchParams }) {
  const admin = await requireRole("admin");
  const { role } = await searchParams;
  const filter = role === "student" || role === "donor" || role === "admin" ? role : "all";

  const people = await db.select().from(users);

  // One pass per table, counting with Postgres FILTER
  const reportRows = await db
    .select({
      id: reports.targetUserId,
      total: count(),
      open: sql<number>`count(*) filter (where ${reports.status} = 'open')`.mapWith(Number),
    })
    .from(reports)
    .groupBy(reports.targetUserId);
  const listingRows = await db.select({ id: listings.donorId, n: count() }).from(listings).groupBy(listings.donorId);
  const claimRows = await db
    .select({
      id: claims.studentId,
      n: count(),
      noShows: sql<number>`count(*) filter (where ${claims.status} = 'no_show')`.mapWith(Number),
    })
    .from(claims)
    .groupBy(claims.studentId);

  const reportsBy = new Map(reportRows.map((r) => [r.id, r]));
  const listingsBy = new Map(listingRows.map((r) => [r.id, r.n]));
  const claimsBy = new Map(claimRows.map((r) => [r.id, r]));

  const list = people
    .filter((p) => filter === "all" || p.role === filter || (filter === "admin" && p.isAdmin))
    .map((p) => ({ ...p, rep: reportsBy.get(p.id), listingsN: listingsBy.get(p.id) ?? 0, claim: claimsBy.get(p.id) }))
    .sort((a, b) => (b.rep?.open ?? 0) - (a.rep?.open ?? 0) || (a.businessName ?? a.name).localeCompare(b.businessName ?? b.name));

  const tab = (value: string, label: string) => (
    <Link href={value === "all" ? "/admin/users" : `/admin/users?role=${value}`}
      className={`rounded-full px-3 py-1 text-sm font-semibold ${filter === value ? "bg-teal text-[var(--on-teal)]" : ""}`}>{label}</Link>
  );

  return (
    <>
      <AppHeader name={admin.name} role={admin.role} />
      <main className="mx-auto max-w-[1120px] px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">Accounts</h1>
            <p className="mt-2 text-ink-2">Every student, café and admin. Accounts with open reports are listed first.</p>
          </div>
          <div className="flex gap-1 rounded-full border border-line bg-surface p-1">
            {tab("all", "All")}{tab("student", "Students")}{tab("donor", "Cafés")}{tab("admin", "Admins")}
          </div>
        </div>

        <CreateAccountForm />

        <div className="panel mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-ink-2">
              <tr className="border-b border-line">
                <th className="py-2 pr-3">Name</th><th className="pr-3">Type</th><th className="pr-3">Joined</th>
                <th className="pr-3">Activity</th><th className="pr-3">Open reports</th><th className="pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="border-b border-line">
                  <td className="py-3 pr-3">
                    <Link href={`/admin/users/${p.id}`} className="link text-base font-semibold">{p.businessName ?? p.name}</Link>
                    <span className="block text-ink-2">{p.email}</span>
                  </td>
                  <td className="pr-3">{p.role === "donor" ? "Café" : p.role === "admin" ? "Admin" : "Student"}{p.isAdmin ? " + admin" : ""}</td>
                  <td className="pr-3">{p.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                  <td className="pr-3">
                    {p.role === "donor"
                      ? `${p.listingsN} listings`
                      : `${p.claim?.n ?? 0} claims${p.claim?.noShows ? `, ${p.claim.noShows} no-shows` : ""}`}
                  </td>
                  <td className="pr-3">
                    {p.rep?.open ? <span className="badge crit">{p.rep.open} open</span> : <span className="text-ink-2">None</span>}
                    {p.rep ? <span className="block text-xs text-ink-2">{p.rep.total} total</span> : null}
                  </td>
                  <td className="pr-3">{p.blockedAt ? <span className="badge crit">Blocked</span> : <span className="badge fresh">Active</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <p className="py-6 text-center text-ink-2">No accounts yet.</p>}
        </div>
      </main>
    </>
  );
}
