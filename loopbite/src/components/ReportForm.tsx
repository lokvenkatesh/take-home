"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitReport } from "@/app/actions/reports";
import { reasonsFor, type ReportKind } from "@/lib/reports";

const option =
  "flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-3 has-checked:border-teal has-checked:bg-teal-soft has-focus-visible:ring-2 has-focus-visible:ring-gold";

export function ReportForm({ listingId, kind, backHref }: { listingId: string; kind: ReportKind; backHref: string }) {
  const [state, action, pending] = useActionState(submitReport, undefined);

  if (state?.sentId) {
    return (
      <div className="panel reveal mt-6 border-teal">
        <h2 className="text-xl font-bold">Report sent</h2>
        <p className="mt-2 text-ink-2">A LoopBite admin sees it now and usually responds within a day.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/reports" className="btn">See your reports</Link>
          <Link href={backHref} className="btn ghost">Go back</Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 space-y-5">
      <input type="hidden" name="listingId" value={listingId} />
      <fieldset className="space-y-2">
        <legend className="mb-2 font-semibold">What went wrong?</legend>
        {reasonsFor(kind).map((r, i) => (
          <label key={r.value} className={option}>
            <input type="radio" name="reason" value={r.value} defaultChecked={i === 0} className="mt-1 accent-[var(--teal)]" />
            <span>{r.label}</span>
          </label>
        ))}
      </fieldset>
      <label className="f">
        What happened?
        <textarea name="details" rows={4} maxLength={1000} required minLength={10}
          placeholder="What happened, and when?" className="lb-in mt-1" />
      </label>
      <p className="text-sm text-ink-2">
        If someone is sick, get medical help first. For suspected food poisoning, also contact your local health department.
      </p>
      {state?.error && <p role="alert" className="badge crit">{state.error}</p>}
      <div className="flex gap-3">
        <button disabled={pending} className="btn">{pending ? "Sending…" : "Send report"}</button>
        <Link href={backHref} className="btn ghost">Cancel</Link>
      </div>
    </form>
  );
}
