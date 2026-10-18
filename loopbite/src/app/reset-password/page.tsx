"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resetPassword } from "@/app/actions/password";
import { AuthShell } from "@/components/AuthShell";
import { SUPPORT_MAILTO } from "@/lib/support";

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Set a new password">
      <Suspense fallback={null}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [state, action, pending] = useActionState(resetPassword, undefined);

  if (!token) {
    return (
      <div className="mt-4 space-y-4">
        <p>This link is incomplete. Open it straight from the email, or request a new one.</p>
        <Link href="/forgot-password" className="btn w-full">Request a new link</Link>
      </div>
    );
  }

  return (
    <>
      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="token" value={token} />
        <label className="f">
          New password
          <input name="password" type="password" autoComplete="new-password" minLength={8} required className="lb-in mt-1" />
          <span className="text-xs font-normal text-ink-2">At least 8 characters</span>
        </label>
        <label className="f">
          Confirm new password
          <input name="confirm" type="password" autoComplete="new-password" minLength={8} required className="lb-in mt-1" />
        </label>
        {state?.error && <p role="alert" className="rounded-lg bg-crit-soft px-3 py-2 text-sm font-semibold text-crit">{state.error}</p>}
        <button disabled={pending} className="btn w-full">{pending ? "Saving…" : "Save new password"}</button>
      </form>
      <div className="mt-6 space-y-2 text-sm text-ink-2">
        <p><Link href="/forgot-password" className="font-bold text-ink underline">Request a new link</Link></p>
        <p>Still stuck? <a href={SUPPORT_MAILTO} className="font-bold text-ink underline">Email the LoopBite admin</a></p>
      </div>
    </>
  );
}
