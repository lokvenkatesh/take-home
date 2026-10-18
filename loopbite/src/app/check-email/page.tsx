"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resendVerification } from "@/app/actions/auth";
import { AuthShell } from "@/components/AuthShell";

export default function CheckEmailPage() {
  return (
    <AuthShell title="Check your email">
      <Suspense fallback={null}>
        <CheckEmail />
      </Suspense>
    </AuthShell>
  );
}

function CheckEmail() {
  const email = useSearchParams().get("email") ?? "";
  const [state, action, pending] = useActionState(resendVerification, undefined);

  return (
    <div className="mt-4 space-y-4">
      <p>
        We sent a confirmation link to <b>{email || "your email"}</b>. Click it to activate your account, then sign in.
      </p>
      <p className="text-sm text-ink-2">The link works for 24 hours. If you don&apos;t see it, check your spam folder.</p>
      <form action={action}>
        <input type="hidden" name="email" value={email} />
        <button disabled={pending || !email} className="btn ghost w-full">{pending ? "Sending…" : "Send the link again"}</button>
      </form>
      {state?.message && <p role="status" className="reveal rounded-lg bg-teal-soft px-3 py-2 text-sm">{state.message}</p>}
      <Link href="/login" className="link inline-block">Back to sign in</Link>
    </div>
  );
}
