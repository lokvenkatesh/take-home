"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/password";
import { AuthShell } from "@/components/AuthShell";
import { SUPPORT_MAILTO } from "@/lib/support";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);

  return (
    <AuthShell title="Forgot your password?">
      <p className="mt-3 text-ink-2">Enter the email you signed up with and we&apos;ll send you a link to set a new one.</p>
      <form action={action} className="mt-6 space-y-4">
        <label className="f">
          Email
          <input name="email" type="email" autoComplete="email" required className="lb-in mt-1" />
        </label>
        <button disabled={pending} className="btn w-full">{pending ? "Sending…" : "Send reset link"}</button>
      </form>
      {state?.message && <p role="status" className="reveal mt-4 rounded-lg bg-teal-soft px-3 py-2 text-sm">{state.message}</p>}

      <div className="mt-6 space-y-2 text-sm text-ink-2">
        <p><Link href="/login" className="font-bold text-ink underline">Back to sign in</Link></p>
        <p>
          Not getting the email, or no longer have access to it?{" "}
          <a href={SUPPORT_MAILTO} className="font-bold text-ink underline">Email the LoopBite admin</a>
        </p>
      </div>
    </AuthShell>
  );
}
