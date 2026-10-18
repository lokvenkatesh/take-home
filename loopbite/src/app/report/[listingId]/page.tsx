import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { claims, listings, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { ReportForm } from "@/components/ReportForm";

type Params = Promise<{ listingId: string }>;

export default function ReportPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className="p-6">Loading…</p>}>
      <Report params={params} />
    </Suspense>
  );
}

async function Report({ params }: { params: Params }) {
  const user = await requireUser();
  if (user.role === "admin") redirect("/admin");

  const { listingId } = await params;
  if (!z.uuid().safeParse(listingId).success) notFound();

  const [row] = await db
    .select({ listing: listings, donorName: users.businessName })
    .from(listings)
    .innerJoin(users, eq(users.id, listings.donorId))
    .where(eq(listings.id, listingId))
    .limit(1);
  if (!row) notFound();

  let about: string;
  if (user.role === "student") {
    about = row.donorName ?? "this donor";
  } else {
    if (row.listing.donorId !== user.id) notFound();
    const [claim] = await db
      .select({ name: users.name })
      .from(claims)
      .innerJoin(users, eq(users.id, claims.studentId))
      .where(and(eq(claims.listingId, listingId), inArray(claims.status, ["active", "picked_up", "no_show"])))
      .orderBy(desc(claims.createdAt))
      .limit(1);
    if (!claim) notFound();
    about = claim.name;
  }

  const kind = user.role === "student" ? "food" : "student";

  return (
    <>
      <AppHeader name={user.name} role={user.role} businessName={user.businessName} />
      <main className="mx-auto max-w-2xl px-5 py-8">
        <h1 className="text-3xl font-bold md:text-4xl">
          {kind === "food" ? "Report a problem with this food" : "Report this student"}
        </h1>
        <p className="mt-2 text-ink-2">
          {row.listing.title}. {kind === "food" ? `From ${about}.` : `Claimed by ${about}.`} Reports go straight to LoopBite admins.
        </p>
        <ReportForm listingId={listingId} kind={kind} backHref={user.role === "student" ? "/feed" : "/donor"} />
      </main>
    </>
  );
}
