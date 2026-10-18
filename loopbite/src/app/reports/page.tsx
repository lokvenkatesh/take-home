import { Suspense } from "react";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { listings, reports } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { REPORT_STATUS_LABEL, reasonLabel } from "@/lib/reports";
import { AppHeader } from "@/components/AppHeader";

export default function MyReportsPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading…</p>}>
      <MyReports />
    </Suspense>
  );
}

async function MyReports() {
  const user = await requireUser();
  if (user.role === "admin") redirect("/admin");

  const rows = await db
    .select({ report: reports, title: listings.title })
    .from(reports)
    .leftJoin(listings, eq(listings.id, reports.listingId))
    .where(eq(reports.reporterId, user.id))
    .orderBy(desc(reports.createdAt));

  return (
    <>
      <AppHeader name={user.name} role={user.role} businessName={user.businessName} />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="text-3xl font-bold md:text-4xl">Your reports</h1>
        {rows.length === 0 ? (
          <div className="empty mt-6"><p>You haven&apos;t reported anything.</p></div>
        ) : (
          <ul className="mt-6 space-y-3">
            {rows.map(({ report: r, title }) => (
              <li key={r.id} className="panel flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{reasonLabel(r.reason)}</p>
                  <p className="text-sm text-ink-2">{title ?? "Listing removed"}</p>
                  <p className="mt-1 text-sm">{r.details}</p>
                </div>
                <span className={`badge ${r.status === "open" ? "lock" : "neutral"}`}>{REPORT_STATUS_LABEL[r.status]}</span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
