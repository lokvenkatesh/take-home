import { Suspense } from "react";
import Link from "next/link";
import { and, asc, count, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { claims, listings, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { CATEGORIES, formatMinutes } from "@/lib/listings";
import { MAX_ACTIVE_CLAIMS } from "@/lib/claims";
import { checkSafety, scoreListing, type Prefs } from "@/lib/ranking";
import { AppHeader } from "@/components/AppHeader";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Announcements } from "@/components/Announcements";
import { CategoryTile } from "@/components/CategoryTile";
import { ClaimButton } from "@/components/ClaimButton";
import { LiveTimeTag } from "@/components/LiveTimeTag";
import { InsightButton } from "@/components/InsightButton";
import { InsightDrawer } from "@/components/InsightDrawer";

type SearchParams = Promise<{ category?: string; sort?: string; all?: string }>;

export default function FeedPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<p className="p-6">Loading…</p>}>
      <Feed searchParams={searchParams} />
    </Suspense>
  );
}

const HANDLING_TEXT = { hot: "Kept hot", cold: "Kept cold", room: "Room temp" } as const;

async function Feed({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireRole("student");
  const params = await searchParams;
  const activeCategory = CATEGORIES.find((c) => c.value === params.category)?.value;
  const sort = params.sort === "soon" ? "soon" : "match";
  const showAll = params.all === "1";
  const now = new Date();

  // Keeps the other filters when one changes
  const href = (change: Record<string, string | undefined>) => {
    const next = { category: activeCategory, sort: sort === "soon" ? "soon" : undefined, all: showAll ? "1" : undefined, ...change };
    const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
    return qs ? `/feed?${qs}` : "/feed";
  };

  const [prefRow] = await db
    .select({ categories: users.prefCategories, avoid: users.avoidAllergens, diet: users.dietNeeds })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  const prefs: Prefs = prefRow;

  // What this student has actually collected, by category
  const historyRows = await db
    .select({ category: listings.category, n: count() })
    .from(claims)
    .innerJoin(listings, eq(listings.id, claims.listingId))
    .where(and(eq(claims.studentId, user.id), eq(claims.status, "picked_up")))
    .groupBy(listings.category);
  const history = Object.fromEntries(historyRows.map((r) => [r.category, r.n]));

  const rows = await db
    .select({ listing: listings, donorName: users.businessName })
    .from(listings)
    .innerJoin(users, eq(users.id, listings.donorId))
    .where(
      and(
        eq(listings.status, "available"),
        gt(listings.expiresAt, now),
        isNull(users.blockedAt),
        activeCategory ? eq(listings.category, activeCategory) : undefined,
      ),
    )
    .orderBy(asc(listings.expiresAt));

  const checked = rows.map((r) => ({ ...r, safety: checkSafety(r.listing, prefs) }));
  const hiddenCount = checked.filter((r) => !r.safety.ok).length;
  const ranked = checked
    .filter((r) => showAll || r.safety.ok)
    .map((r) => ({ ...r, ...scoreListing(r.listing, prefs, history, now.getTime()) }));
  if (sort === "match") ranked.sort((a, b) => b.score - a.score);

  const myClaims = await db
    .select({ id: claims.id, code: claims.code, title: listings.title })
    .from(claims)
    .innerJoin(listings, eq(listings.id, claims.listingId))
    .where(and(eq(claims.studentId, user.id), eq(claims.status, "active")));

  const atLimit = myClaims.length >= MAX_ACTIVE_CLAIMS;
  const hasPrefs = prefs.categories.length + prefs.avoid.length + prefs.diet.length > 0;
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-sm font-semibold ${active ? "border-teal bg-teal text-[var(--on-teal)]" : "border-line bg-surface"}`;

  return (
    <>
      <AppHeader name={user.name} role={user.role} />
      <AutoRefresh />
      <InsightDrawer />
      <main className="mx-auto max-w-[1120px] px-5 py-8">
        <Announcements userId={user.id} role={user.role} />
        {myClaims.length > 0 && (
          <section className="panel mb-6 border-teal">
            <p className="font-semibold">
              You have {myClaims.length} of {MAX_ACTIVE_CLAIMS} pickups waiting
              {atLimit ? ". Pick one up before claiming more." : "."}
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {myClaims.map((c) => (
                <li key={c.id}>
                  <Link href={`/claims/${c.id}`} className="link">{c.title}</Link>, code {c.code}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">Food near you</h1>
            <p className="mt-2 text-ink-2">
              {ranked.length === 1 ? "1 listing" : `${ranked.length} listings`}
              {sort === "match" ? ", best matches for you first." : ", soonest to go first."}
              {!hasPrefs && <> <Link href="/preferences" className="link">Set your preferences</Link> to personalize this.</>}
            </p>
          </div>
          <div className="flex gap-1 rounded-full border border-line bg-surface p-1" role="group" aria-label="Sort">
            <Link href={href({ sort: undefined })} className={`rounded-full px-3 py-1 text-sm font-semibold ${sort === "match" ? "bg-teal text-[var(--on-teal)]" : ""}`}>Best match</Link>
            <Link href={href({ sort: "soon" })} className={`rounded-full px-3 py-1 text-sm font-semibold ${sort === "soon" ? "bg-teal text-[var(--on-teal)]" : ""}`}>Soonest to go</Link>
          </div>
        </div>

        <nav aria-label="Filter by category" className="mt-5 flex flex-wrap gap-2">
          <Link href={href({ category: undefined })} className={chip(!activeCategory)}>All</Link>
          {CATEGORIES.map((c) => (
            <Link key={c.value} href={href({ category: c.value })} className={chip(activeCategory === c.value)}>{c.label}</Link>
          ))}
        </nav>

        {hiddenCount > 0 && (
          <p className="mt-4 text-sm text-ink-2">
            {showAll
              ? <>Showing everything, including food that doesn&apos;t fit your allergens or diet. <Link href={href({ all: undefined })} className="link">Hide those again</Link></>
              : <>{hiddenCount === 1 ? "1 listing is" : `${hiddenCount} listings are`} hidden because of your allergens or diet. <Link href={href({ all: "1" })} className="link">Show them</Link></>}
          </p>
        )}

        {ranked.length === 0 ? (
          <div className="empty mt-8">
            <h3 className="text-lg font-bold text-ink">No food right now</h3>
            <p className="mt-1">
              {activeCategory ? "Try another category, or check back soon." : "Keep this page open. New listings appear here as soon as they're posted."}
            </p>
          </div>
        ) : (
          <ul className="mt-6 space-y-3.5">
            {ranked.map(({ listing: l, donorName, safety, score, parts }) => {
              const pickupLeft = Math.max(0, Math.round((l.pickupEnd.getTime() - now.getTime()) / 60_000));
              return (
                <li key={l.id} className={`listing ${now.getTime() - l.createdAt.getTime() < 90_000 ? "just-posted" : ""}`}>
                  <CategoryTile category={l.category} />
                  <div>
                    <div className="l-top">
                      <div>
                        <h3 className="text-lg font-semibold">{l.title}</h3>
                        <p className="l-donor">{donorName}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <InsightButton listingId={l.id} title={l.title} />
                        <LiveTimeTag expiresAt={l.expiresAt.toISOString()} serverNow={now.getTime()} />
                      </div>
                    </div>
                    {l.description && <p className="l-desc">{l.description}</p>}
                    <div className="l-meta">
                      <span>{l.quantityText}, about {l.estLbs} lb</span>
                      <span>{HANDLING_TEXT[l.handling]}</span>
                      <span>{l.location}</span>
                      <span>{pickupLeft > 0 ? `Pick up within ${formatMinutes(pickupLeft)}` : "Pickup window has closed"}</span>
                    </div>
                    {(l.allergens.length > 0 || l.dietary.length > 0) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {l.dietary.map((d) => <span key={d} className="badge fresh">{d}</span>)}
                        {l.allergens.map((a) => (
                          <span key={a} className={`badge ${safety.blocked.includes(a) ? "crit" : "lock"}`}>Contains {a}</span>
                        ))}
                      </div>
                    )}
                    {!safety.ok && (
                      <p className="mt-2 text-sm font-semibold text-crit">
                        {safety.blocked.length > 0 && `Contains ${safety.blocked.join(", ")}, which you avoid. `}
                        {safety.missing.length > 0 && `Not marked ${safety.missing.join(", ")}.`}
                      </p>
                    )}

                    <details className="mt-3 text-sm">
                      <summary className="cursor-pointer font-semibold text-teal">
                        Match {score} <span className="text-ink-2">· why this ranks here</span>
                      </summary>
                      <ul className="mt-2 space-y-2">
                        {parts.map((p) => (
                          <li key={p.label} className="grid grid-cols-[110px_1fr_auto] items-center gap-3">
                            <span className="font-semibold">{p.label}</span>
                            <span className="h-2 overflow-hidden rounded bg-line">
                              <span className="block h-full rounded bg-teal" style={{ width: `${(p.points / p.max) * 100}%` }} />
                            </span>
                            <span className="tabular-nums">{p.points}/{p.max}</span>
                            <span className="col-span-3 -mt-1 text-ink-2">{p.detail}</span>
                          </li>
                        ))}
                      </ul>
                    </details>

                    <div className="l-foot"><ClaimButton listingId={l.id} /><Link href={`/report/${l.id}`} className="link">Report a problem</Link></div>
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
