import { Suspense } from "react";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { claims, listings, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { LiveTimeTag } from "@/components/LiveTimeTag";
import { btn } from "@/components/ui";

export default function ClaimsPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading…</p>}>
      <MyClaims />
    </Suspense>
  );
}

const STATUS_LABEL = { active: "Waiting for pickup", picked_up: "Picked up", released: "Dropped", no_show: "Missed" } as const;

async function MyClaims() {
  const user = await requireRole("student");
  const rows = await db
    .select({ claim: claims, title: listings.title, location: listings.location, pickupEnd: listings.pickupEnd, donorName: users.businessName })
    .from(claims)
    .innerJoin(listings, eq(listings.id, claims.listingId))
    .innerJoin(users, eq(users.id, listings.donorId))
    .where(eq(claims.studentId, user.id))
    .orderBy(desc(claims.createdAt));

  const active = rows.filter((r) => r.claim.status === "active");
  const past = rows.filter((r) => r.claim.status !== "active");
  const now = Date.now();

  return (
    <>
      <AppHeader name={user.name} role={user.role} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-display text-4xl font-extrabold">My claims</h1>

        <h2 className="mt-8 font-display text-xl font-extrabold">Waiting for pickup</h2>
        {active.length === 0 ? (
          <div className="mt-3 rounded-xl border-2 border-dashed border-line p-6">
            <p className="text-muted">Nothing waiting. Claim something and it shows up here.</p>
            <Link href="/feed" className={`${btn} mt-4`}>Find food</Link>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {active.map((r) => (
              <li key={r.claim.id}>
                <Link href={`/claims/${r.claim.id}`} className="flex items-center justify-between gap-4 rounded-xl border-2 border-herb bg-surface p-4">
                  <div>
                    <p className="font-bold">{r.title}</p>
                    <p className="text-sm text-muted">{r.donorName}, {r.location}</p>
                    <p className="mt-1 font-display font-extrabold tracking-wider">{r.claim.code}</p>
                  </div>
                  <LiveTimeTag expiresAt={r.pickupEnd.toISOString()} serverNow={now} />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {past.length > 0 && (
          <>
            <h2 className="mt-10 font-display text-xl font-extrabold">History</h2>
            <ul className="mt-3 divide-y-2 divide-line rounded-xl border-2 border-line bg-surface">
              {past.map((r) => (
                <li key={r.claim.id} className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-bold">{r.title}</p>
                    <p className="text-sm text-muted">{r.donorName}</p>
                  </div>
                  <span className="text-sm font-bold text-muted">{STATUS_LABEL[r.claim.status]}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </>
  );
}
