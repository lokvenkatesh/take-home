import { Suspense } from "react";
import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { claims, listings, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { STATUS_LABEL, effectiveStatus, formatMinutes } from "@/lib/listings";
import { AppHeader } from "@/components/AppHeader";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Announcements } from "@/components/Announcements";
import { CategoryTile } from "@/components/CategoryTile";
import { LiveTimeTag } from "@/components/LiveTimeTag";
import { ClaimedListingActions, ConfirmCodeForm } from "@/components/DonorPickupForms";

export default function DonorPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading…</p>}>
      <Donor />
    </Suspense>
  );
}

async function Donor() {
  const user = await requireRole("donor");

  const rows = await db
    .select({ listing: listings, claimId: claims.id, code: claims.code, studentName: users.name })
    .from(listings)
    .leftJoin(claims, and(eq(claims.listingId, listings.id), inArray(claims.status, ["active", "picked_up"])))
    .leftJoin(users, eq(users.id, claims.studentId))
    .where(eq(listings.donorId, user.id))
    .orderBy(desc(listings.createdAt));

  const now = Date.now();
  const waiting = rows.filter((r) => r.listing.status === "claimed").length;

  return (
    <>
      <AppHeader name={user.name} role={user.role} businessName={user.businessName} />
      <AutoRefresh />
      <main className="mx-auto max-w-[1120px] px-5 py-8">
        <Announcements userId={user.id} role={user.role} />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">{user.businessName}</h1>
            <p className="mt-2 text-ink-2">
              {waiting === 0 ? "No pickups waiting right now." : waiting === 1 ? "1 student is coming to pick up." : `${waiting} students are coming to pick up.`}
            </p>
          </div>
          <Link href="/donor/new" className="btn">Post food</Link>
        </div>

        {rows.length > 0 && <div className="mt-6 max-w-xl"><ConfirmCodeForm /></div>}

        {rows.length === 0 ? (
          <div className="empty mt-8">
            <h3 className="text-lg font-bold text-ink">Nothing posted yet</h3>
            <p className="mt-1">Have leftovers today? Post them and students will see them right away.</p>
            <Link href="/donor/new" className="btn mt-4">Post your first listing</Link>
          </div>
        ) : (
          <ul className="mt-6 space-y-3.5">
            {rows.map(({ listing: l, claimId, code, studentName }) => {
              const status = effectiveStatus(l.status, l.expiresAt, now);
              const live = status === "available" || status === "claimed";
              const pickupLeft = Math.round((l.pickupEnd.getTime() - now) / 60_000);
              return (
                <li key={l.id} className={`listing ${status === "claimed" ? "claimed" : ""} ${now - l.createdAt.getTime() < 90_000 ? "just-posted" : ""}`}>
                  <CategoryTile category={l.category} />
                  <div>
                    <div className="l-top">
                      <div>
                        <h3 className="text-lg font-semibold">{l.title}</h3>
                        <p className="l-donor">{l.quantityText}, about {l.estLbs} lb</p>
                      </div>
                      {live ? (
                        <LiveTimeTag expiresAt={l.expiresAt.toISOString()} serverNow={now} />
                      ) : (
                        <span className={`badge ${status === "picked_up" ? "fresh" : "neutral"}`}>{STATUS_LABEL[status]}</span>
                      )}
                    </div>
                    <div className="l-meta">
                      <span className="font-semibold text-ink">{STATUS_LABEL[status]}</span>
                      {studentName && code && <span>{studentName}, code {code}</span>}
                      {status === "claimed" && (
                        <span>{pickupLeft > 0 ? `Pickup window ends in ${formatMinutes(pickupLeft)}` : "Pickup window has ended"}</span>
                      )}
                    </div>
                    {studentName && <Link href={`/report/${l.id}`} className="link mt-2 inline-block">Report this student</Link>}
                    {status === "claimed" && claimId && code && (
                      <ClaimedListingActions code={code} claimId={claimId} windowClosed={pickupLeft <= 0} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
