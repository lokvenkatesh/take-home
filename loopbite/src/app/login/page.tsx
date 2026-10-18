"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { login, resendVerification } from "@/app/actions/auth";
import { AuthShell } from "@/components/AuthShell";
import { btn, input, label } from "@/components/ui";

export default function LoginPage() {
  return (
    <AuthShell title="Sign in">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const [state, action, pending] = useActionState(login, undefined);
  const [resendState, resend, resending] = useActionState(resendVerification, undefined);

  return (
    <>
      {params.get("verified") === "1" && (
        <p role="status" className="reveal mt-4 rounded-lg bg-teal-soft px-3 py-2 text-sm font-semibold text-teal">
          Email confirmed. Sign in to get started.
        </p>
      )}

      <form action={action} className="mt-6 space-y-4">
        <label className={label}>
          Email
          <input name="email" type="email" autoComplete="email" required defaultValue={params.get("email") ?? ""} className={input} />
        </label>
        <label className={label}>
          Password
          <input name="password" type="password" autoComplete="current-password" required className={input} />
        </label>
        {state?.error && (
          <p role="alert" className="rounded-lg bg-crit-soft px-3 py-2 text-sm font-semibold text-crit">{state.error}</p>
        )}
        <button disabled={pending} className={`${btn} w-full`}>{pending ? "Signing in…" : "Sign in"}</button>
      </form>

      {state?.unverified && (
        <form action={resend} className="mt-3 space-y-2">
          <input type="hidden" name="email" value={state.unverified} />
          <button disabled={resending} className="btn ghost w-full">{resending ? "Sending…" : "Send the confirmation link again"}</button>
          {resendState?.message && <p role="status" className="rounded-lg bg-teal-soft px-3 py-2 text-sm">{resendState.message}</p>}
        </form>
      )}

      <p className="mt-6 text-sm text-ink-2">
        New here? <Link href="/signup" className="font-bold text-ink underline">Create an account</Link>
      </p>
    </>
  );
}
