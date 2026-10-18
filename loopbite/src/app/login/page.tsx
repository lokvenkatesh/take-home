"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/app/actions/auth";
import { AuthShell } from "@/components/AuthShell";
import { btn, input, label } from "@/components/ui";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <AuthShell title="Sign in">
      <form action={action} className="mt-6 space-y-4">
        <label className={label}>
          Email
          <input name="email" type="email" autoComplete="email" required className={input} />
        </label>
        <label className={label}>
          Password
          <input name="password" type="password" autoComplete="current-password" required className={input} />
        </label>
        {state?.error && (
          <p role="alert" className="rounded-lg bg-beet/10 px-3 py-2 text-sm font-bold text-beet">
            {state.error}
          </p>
        )}
        <button disabled={pending} className={`${btn} w-full`}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-sm text-muted">
        New here? <Link href="/signup" className="font-bold text-ink underline">Create an account</Link>
      </p>
    </AuthShell>
  );
}
