"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { createListing, type ListingFormState } from "@/app/actions/listings";
import { aiFillListing, type AiFillState } from "@/app/actions/ai";
import { ALLERGENS, CATEGORIES, DIETARY, GOOD_FOR, HANDLING, PICKUP_WITHIN, formatMinutes } from "@/lib/listings";
import { btn, btnGhost, input, label } from "@/components/ui";

type Values = Record<string, string | string[]>;

const card =
  "cursor-pointer rounded-xl border border-line bg-surface p-3 has-checked:border-teal has-checked:bg-teal-soft has-focus-visible:ring-2 has-focus-visible:ring-gold";
const chip =
  "cursor-pointer rounded-full border border-line bg-surface px-3 py-1 text-sm has-checked:border-teal has-checked:bg-teal has-checked:text-[var(--on-teal)] has-focus-visible:ring-2 has-focus-visible:ring-gold";

const SOURCE_TEXT = {
  claude: "Filled in by Claude.",
  rules: "Filled in from keywords. Add an Anthropic API key to use Claude.",
  "rules-fallback": "Claude wasn't available, so this was filled in from keywords.",
} as const;

// Reads what's currently typed in the form, so the AI fill doesn't wipe it
function readForm(form: HTMLFormElement | null): Values {
  if (!form) return {};
  const fd = new FormData(form);
  const out: Values = {};
  for (const key of new Set(fd.keys())) {
    const all = fd.getAll(key).map(String);
    out[key] = key === "allergens" || key === "dietary" ? all : all[0];
  }
  return out;
}

export function ListingForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Values>({});
  const [formKey, setFormKey] = useState(0); // bump to re-render the form with new values

  const [state, action, pending] = useActionState(async (prev: ListingFormState, fd: FormData) => {
    const result = await createListing(prev, fd);
    if (result?.values) {
      setValues(result.values);
      setFormKey((k) => k + 1);
    }
    return result;
  }, undefined);

  const [aiState, aiAction, aiPending] = useActionState(async (prev: AiFillState, fd: FormData) => {
    const result = await aiFillListing(prev, fd);
    const d = result?.draft;
    if (d) {
      setValues({
        ...readForm(formRef.current), // keep what the donor already typed, like the location
        title: d.title,
        description: d.description,
        category: d.category,
        quantityText: d.quantityText,
        estLbs: d.estLbs ? String(d.estLbs) : "",
        handling: d.handling,
        allergens: d.allergens,
        dietary: d.dietary,
        pickupWithin: String(d.pickupWithin),
        goodFor: String(d.goodFor),
      });
      setFormKey((k) => k + 1);
    }
    return result;
  }, undefined);

  const val = (k: string, fallback = "") => (typeof values[k] === "string" ? (values[k] as string) : fallback);
  const has = (k: string, item: string) => Array.isArray(values[k]) && (values[k] as string[]).includes(item);

  return (
    <>
      <form action={aiAction} className="panel mt-8 border-teal">
        <label htmlFor="aiText" className="text-lg font-bold">Describe it in your own words</label>
        <p className="text-sm text-ink-2">We&apos;ll fill in the form. You check it before posting.</p>
        <textarea id="aiText" name="aiText" rows={2} maxLength={500}
          placeholder="3 trays of chicken alfredo from lunch, still in the warmer" className={`${input} mt-3`} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button disabled={aiPending} className="btn">
            {aiPending ? <><span className="spin" aria-hidden="true" />Reading your description…</> : "Fill in the form"}
          </button>
          {aiState?.error && <span role="alert" className="badge crit">{aiState.error}</span>}
        </div>
        {aiState?.draft && aiState.source && (
          <div className="reveal mt-4 rounded-xl bg-teal-soft p-3 text-sm" role="status">
            <p><b>{SOURCE_TEXT[aiState.source]}</b> Check every field below, especially allergens.</p>
            {aiState.draft.safetyNotes.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 font-semibold text-crit">
                {aiState.draft.safetyNotes.map((n) => (
                  <li key={n}>
                    {n}{" "}
                    <button type="button" className="link font-normal"
                      onClick={() => window.dispatchEvent(new CustomEvent("loopbite:ask", { detail: n + " Can I still donate it?" }))}>
                      Ask the assistant
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </form>

      <form key={formKey} ref={formRef} action={action} className="mt-8 space-y-8">
        <section className="space-y-4">
          <h2 className="text-xl font-bold">What is it?</h2>
          <label className={label}>
            Name
            <input name="title" defaultValue={val("title")} required minLength={3} maxLength={80}
              placeholder="Vegetable lasagna, 2 trays" className={input} />
          </label>
          <label className={label}>
            Details <span className="font-normal text-ink-2">(optional)</span>
            <textarea name="description" defaultValue={val("description")} rows={2} maxLength={400}
              placeholder="Anything students should know" className={input} />
          </label>
          <label className={label}>
            Category
            <select name="category" defaultValue={val("category", "prepared")} className={input}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>
              How much
              <input name="quantityText" defaultValue={val("quantityText")} required placeholder="2 trays" className={input} />
            </label>
            <label className={label}>
              About how many pounds
              <input name="estLbs" type="number" min={1} max={500} defaultValue={val("estLbs")} required className={input} />
            </label>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">How is it stored?</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {HANDLING.map((h) => (
              <label key={h.value} className={card}>
                <input type="radio" name="handling" value={h.value} required
                  defaultChecked={val("handling", "room") === h.value} className="sr-only" />
                <span className="block font-semibold">{h.label}</span>
                <span className="block text-sm text-ink-2">{h.detail}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">Allergens and diet</h2>
          <p className="text-sm text-ink-2">Tick every allergen it contains. If you&apos;re not sure, tick it.</p>
          <div className="flex flex-wrap gap-2">
            {ALLERGENS.map((a) => (
              <label key={a} className={chip}>
                <input type="checkbox" name="allergens" value={a} defaultChecked={has("allergens", a)} className="sr-only" />
                Contains {a}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {DIETARY.map((d) => (
              <label key={d} className={chip}>
                <input type="checkbox" name="dietary" value={d} defaultChecked={has("dietary", d)} className="sr-only" />
                {d}
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">Pickup</h2>
          <label className={label}>
            Where to pick it up
            <input name="location" defaultValue={val("location")} required placeholder="Baker Hall, back entrance" className={input} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>
              Pick up within
              <select name="pickupWithin" defaultValue={val("pickupWithin", "90")} className={input}>
                {PICKUP_WITHIN.map((m) => <option key={m} value={m}>{formatMinutes(m)}</option>)}
              </select>
            </label>
            <label className={label}>
              Good for
              <select name="goodFor" defaultValue={val("goodFor", "180")} className={input}>
                {GOOD_FOR.map((m) => <option key={m} value={m}>{formatMinutes(m)}</option>)}
              </select>
            </label>
          </div>
        </section>

        {state?.error && <p role="alert" className="badge crit">{state.error}</p>}

        <div className="flex gap-3">
          <button disabled={pending} className={btn}>{pending ? "Posting…" : "Post food"}</button>
          <Link href="/donor" className={btnGhost}>Cancel</Link>
        </div>
      </form>
    </>
  );
}
