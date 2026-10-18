"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { savePreferences, type PrefsState, type PrefsValues } from "@/app/actions/preferences";
import { ALLERGENS, CATEGORIES, DIETARY } from "@/lib/listings";

const chip =
  "cursor-pointer rounded-full border border-line bg-surface px-3 py-1.5 text-sm has-checked:border-teal has-checked:bg-teal has-checked:text-[var(--on-teal)] has-focus-visible:ring-2 has-focus-visible:ring-gold";

export function PreferencesForm({ initial }: { initial: PrefsValues }) {
  const [current, setCurrent] = useState<PrefsValues>(initial);
  const [formKey, setFormKey] = useState(0);

  const [state, action, pending] = useActionState(async (prev: PrefsState, fd: FormData) => {
    const result = await savePreferences(prev, fd);
    if (result?.values) {
      setCurrent(result.values); // the newly saved choices become the form's defaults
      setFormKey((k) => k + 1);  // rebuild the form so the checkboxes show them
    }
    return result;
  }, undefined);

  const group = (name: keyof PrefsValues, title: string, help: string, options: { value: string; label: string }[]) => (
    <fieldset className="panel">
      <legend className="sr-only">{title}</legend>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-ink-2">{help}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.value} className={chip}>
            <input type="checkbox" name={name} value={o.value} defaultChecked={current[name].includes(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <form key={formKey} action={action} className="mt-8 space-y-5">
      {group("categories", "What do you like?", "These rank higher in your feed.",
        CATEGORIES.map((c) => ({ value: c.value, label: c.label })))}
      {group("avoid", "Allergens to avoid", "Food containing these is hidden from your feed.",
        ALLERGENS.map((a) => ({ value: a, label: a })))}
      {group("diet", "Diet you follow", "Only food marked with all of these is shown.",
        DIETARY.map((d) => ({ value: d, label: d })))}

      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className="btn">{pending ? "Saving…" : "Save preferences"}</button>
        <Link href="/feed" className="btn ghost">Back to food</Link>
        {state?.saved && <span role="status" className="badge fresh reveal">Saved. Your feed is updated.</span>}
        {state?.error && <span role="alert" className="badge crit">{state.error}</span>}
      </div>
    </form>
  );
}
