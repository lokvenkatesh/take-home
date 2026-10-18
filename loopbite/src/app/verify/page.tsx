import { Suspense } from "react";
import Link from "next/link";
import { verifyEmailToken } from "@/lib/email-verification";
import { TopBar } from "@/components/AuthShell";
import { CheckMark } from "@/components/CheckMark";

type SearchParams = Promise<{ token?: string }>;

export default function VerifyPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-md px-5 py-12">
        <Suspense fallback={<div className="authcard"><span className="spin" aria-hidden="true" />Confirming your email…</div>}>
          <Verify searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function Verify({ searchParams }: { searchParams: SearchParams }) {
  const { token } = await searchParams;
  const result = token ? await verifyEmailToken(token) : ({ ok: false, reason: "invalid" } as const);

  if (result.ok) {
    return (
      <div className="authcard reveal text-center">
        <CheckMark />
        <h1 className="mt-4 text-3xl font-bold">Email confirmed</h1>
        <p className="mt-2 text-ink-2">Your account is ready. Sign in to start finding food.</p>
        <Link href={`/login?email=${encodeURIComponent(result.email)}&verified=1`} className="btn mt-6 w-full">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="authcard">
      <h1 className="text-3xl font-bold">This link doesn&apos;t work</h1>
      <p className="mt-2 text-ink-2">
        {result.reason === "expired"
          ? "It has expired. Links work for 24 hours."
          : "It may be incomplete. Try opening it straight from the email."}{" "}
        Sign in and you can ask for a new link.
      </p>
      <Link href="/login" className="btn mt-6 w-full">Go to sign in</Link>
    </div>
  );
}
