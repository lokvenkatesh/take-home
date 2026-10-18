"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signup } from "@/app/actions/auth";
import { AuthShell } from "@/components/AuthShell";
import { btn, input, label } from "@/components/ui";

const ROLES = [
  { value: "student", title: "I'm a student", detail: "Find and claim food" },
  { value: "donor", title: "I'm a donor", detail: "Dining hall or café" },
];

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, undefined);
  const [role, setRole] = useState("student");

  return (
    <AuthShell title="Create your account">
      <form action={action} className="mt-6 space-y-4">
        <fieldset>
          <legend className={label}>I&apos;m joining as</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {ROLES.map((r) => (
              <label
                key={r.value}
                className="cursor-pointer rounded-lg border-2 border-line bg-surface p-3 has-checked:border-herb has-checked:bg-herb-soft"
              >
                <input
                  type="radio"
                  name="role"
                  value={r.value}
                  checked={role === r.value}
                  onChange={() => setRole(r.value)}
                  className="sr-only"
                />
                <span className="block font-bold">{r.title}</span>
                <span className="block text-sm text-muted">{r.detail}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className={label}>
          Your name
          <input name="name" autoComplete="name" required className={input} />
        </label>
        {role === "donor" && (
          <label className={label}>
            Business name
            <input name="businessName" required placeholder="e.g. Baker Hall Dining" className={input} />
          </label>
        )}
        <label className={label}>
          Email
          <input name="email" type="email" autoComplete="email" required className={input} />
        </label>
        <label className={label}>
          Password
          <input name="password" type="password" minLength={8} autoComplete="new-password" required className={input} />
          <span className="mt-1 block text-xs font-normal text-muted">At least 8 characters</span>
        </label>
        {state?.error && (
          <p role="alert" className="rounded-lg bg-beet/10 px-3 py-2 text-sm font-bold text-beet">
            {state.error}
          </p>
        )}
        <button disabled={pending} className={`${btn} w-full`}>
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-sm text-muted">
        Already have an account? <Link href="/login" className="font-bold text-ink underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}
