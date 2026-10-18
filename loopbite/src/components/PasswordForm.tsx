"use client";

import { useActionState } from "react";
import Link from "next/link";
import { changePassword } from "@/app/actions/account";

export function PasswordForm({ homeHref }: { homeHref: string }) {
  const [state, action, pending] = useActionState(changePassword, undefined);

  if (state?.saved) {
    return (
      <div className="panel reveal mt-6 border-teal" role="status">
        <h2 className="text-xl font-bold">Password changed</h2>
        <p className="mt-2 text-ink-2">Use your new password next time you sign in.</p>
        <Link href={homeHref} className="btn mt-4">Continue</Link>
      </div>
    );
  }

  return (
    <form action={action} className="panel mt-6 max-w-md space-y-4">
      <h2 className="text-xl font-bold">Change password</h2>
      <label className="f">
        Current password
        <input name="current" type="password" autoComplete="current-password" required className="lb-in" />
      </label>
      <label className="f">
        New password
        <input name="next" type="password" autoComplete="new-password" minLength={8} required className="lb-in" />
        <span className="text-xs font-normal text-ink-2">At least 8 characters</span>
      </label>
      <label className="f">
        Confirm new password
        <input name="confirm" type="password" autoComplete="new-password" minLength={8} required className="lb-in" />
      </label>
      {state?.error && <p role="alert" className="badge crit">{state.error}</p>}
      <button disabled={pending} className="btn">{pending ? "Saving…" : "Change password"}</button>
    </form>
  );
}
