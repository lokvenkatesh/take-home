import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { PasswordForm } from "@/components/PasswordForm";

type SearchParams = Promise<{ first?: string }>;
const HOME = { donor: "/donor", student: "/feed", admin: "/admin" } as const;
const ROLE = { donor: "Café", student: "Student", admin: "Admin" } as const;

export default function AccountPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<p className="p-6">Loading…</p>}>
      <Account searchParams={searchParams} />
    </Suspense>
  );
}

async function Account({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const { first } = await searchParams;
  const [row] = await db
    .select({ mustChange: users.mustChangePassword, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  const mustChange = row?.mustChange || first === "1";

  return (
    <>
      <AppHeader name={user.name} role={user.role} businessName={user.businessName} />
      <main className="mx-auto max-w-[1120px] px-5 py-8">
        <h1 className="text-3xl font-bold md:text-4xl">Your account</h1>

        {mustChange && (
          <div className="mt-6 rounded-2xl border border-gold bg-gold-soft p-4" role="alert">
            <p className="font-bold">Set your own password</p>
            <p className="mt-1 text-sm">You signed in with a temporary password. Choose a new one so only you know it.</p>
          </div>
        )}

        <dl className="panel mt-6 grid max-w-md grid-cols-[120px_1fr] gap-y-2 text-sm">
          <dt className="text-ink-2">Name</dt><dd className="font-semibold">{user.name}</dd>
          {user.businessName && (<><dt className="text-ink-2">Business</dt><dd className="font-semibold">{user.businessName}</dd></>)}
          <dt className="text-ink-2">Email</dt><dd className="font-semibold">{user.email}</dd>
          <dt className="text-ink-2">Account type</dt><dd className="font-semibold">{ROLE[user.role]}{user.isAdmin ? ", with admin access" : ""}</dd>
          <dt className="text-ink-2">Joined</dt>
          <dd className="font-semibold">{row?.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</dd>
        </dl>

        <PasswordForm homeHref={HOME[user.role]} />
      </main>
    </>
  );
}
