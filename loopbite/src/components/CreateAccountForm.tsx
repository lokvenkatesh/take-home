"use client";

import { useActionState, useState } from "react";
import { createAccount } from "@/app/actions/access";

const ROLE_LABEL: Record<string, string> = { student: "student", donor: "café", admin: "admin" };

export function CreateAccountForm() {
  const [state, action, pending] = useActionState(createAccount, undefined);
  const [role, setRole] = useState("student");

  return (
    <section className="panel mt-6">
      <h2 className="text-xl font-bold">Add an account</h2>
      <p className="mt-1 text-sm text-ink-2">
        Create an account for someone and share the temporary password with them. This is how new admins are added.
      </p>

      {state?.created && (
        <div className="reveal mt-4 rounded-xl border border-teal bg-teal-soft p-4" role="status">
          <p className="font-semibold">
            Created a {ROLE_LABEL[state.created.role]} account for {state.created.name}.
          </p>
          <p className="mt-2 text-sm">Email: <b>{state.created.email}</b></p>
          <p className="text-sm">Temporary password: <b className="font-display text-lg tracking-wide">{state.created.password}</b></p>
          <p className="mt-2 text-sm text-ink-2">Copy it now. It won&apos;t be shown again.</p>
        </div>
      )}

      <form action={action} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
        <label className="f">
          Name
          <input name="name" required minLength={2} className="lb-in" />
        </label>
        <label className="f">
          Email
          <input name="email" type="email" required className="lb-in" />
        </label>
        <label className="f">
          Access
          <select name="role" value={role} onChange={(e) => setRole(e.target.value)} className="lb-in">
            <option value="student">Student</option>
            <option value="donor">Café</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button disabled={pending} className="btn">{pending ? "Creating…" : "Create account"}</button>
        {role === "donor" && (
          <label className="f md:col-span-2">
            Business name
            <input name="businessName" required placeholder="Baker Hall Dining" className="lb-in" />
          </label>
        )}
      </form>
      {state?.error && <p role="alert" className="badge crit mt-3">{state.error}</p>}
    </section>
  );
}
