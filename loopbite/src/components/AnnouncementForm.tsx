"use client";

import { useActionState } from "react";
import { createAnnouncement } from "@/app/actions/admin";
import { RUNS_FOR, STARTS_IN } from "@/lib/announcement-options";

const option =
  "cursor-pointer rounded-xl border border-line bg-surface p-3 has-checked:border-teal has-checked:bg-teal-soft has-focus-visible:ring-2 has-focus-visible:ring-gold";

const KINDS = [
  { value: "event", label: "Event", detail: "Pizza night, food drive, a tasting" },
  { value: "alert", label: "Alert", detail: "Shown as a banner. Pickup changes, closures" },
  { value: "promo", label: "Promotion", detail: "A café's regular offer, a new partner" },
];

export function AnnouncementForm() {
  const [state, action, pending] = useActionState(createAnnouncement, undefined);

  return (
    <form action={action} className="panel space-y-4">
      <h2 className="text-xl font-bold">New post</h2>
      <fieldset className="grid gap-2 sm:grid-cols-3">
        <legend className="sr-only">Type</legend>
        {KINDS.map((k, i) => (
          <label key={k.value} className={option}>
            <input type="radio" name="kind" value={k.value} defaultChecked={i === 0} className="sr-only" />
            <span className="block font-semibold">{k.label}</span>
            <span className="block text-sm text-ink-2">{k.detail}</span>
          </label>
        ))}
      </fieldset>
      <label className="f">
        Title
        <input name="title" required minLength={3} maxLength={100} placeholder="Free pizza night" className="lb-in" />
      </label>
      <label className="f">
        Details <span className="font-normal text-ink-2">(optional)</span>
        <textarea name="body" rows={2} maxLength={500} placeholder="Leftover pizza from the club fair, first come first served" className="lb-in" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="f">
          Location <span className="font-normal text-ink-2">(optional)</span>
          <input name="location" maxLength={120} placeholder="Student Union, room 210" className="lb-in" />
        </label>
        <label className="f">
          Link <span className="font-normal text-ink-2">(optional)</span>
          <input name="link" type="url" placeholder="https://" className="lb-in" />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="f">
          Who sees it
          <select name="audience" defaultValue="all" className="lb-in">
            <option value="all">Everyone</option>
            <option value="students">Students</option>
            <option value="donors">Cafés and dining halls</option>
          </select>
        </label>
        <label className="f">
          Starts
          <select name="startsIn" defaultValue="0" className="lb-in">
            {STARTS_IN.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="f">
          Runs for
          <select name="runsFor" defaultValue="180" className="lb-in">
            {RUNS_FOR.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className="btn">{pending ? "Posting…" : "Post it"}</button>
        {state?.posted && <span role="status" className="badge fresh reveal">Posted “{state.posted}”</span>}
        {state?.error && <span role="alert" className="badge crit">{state.error}</span>}
      </div>
    </form>
  );
}
