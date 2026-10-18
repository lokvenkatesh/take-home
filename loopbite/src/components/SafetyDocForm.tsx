"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import { saveSafetyDoc } from "@/app/actions/library";

type Initial = { id: string; title: string; source: string; url: string | null; body: string } | undefined;

export function SafetyDocForm({ initial }: { initial: Initial }) {
  const [state, action, pending] = useActionState(saveSafetyDoc, undefined);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Read a .txt or .md file into the text box
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !bodyRef.current) return;
    file.text().then((t) => { if (bodyRef.current) bodyRef.current.value = t; });
  }

  return (
    <form key={initial?.id ?? "new"} action={action} className="panel space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{initial ? "Edit document" : "Add a document"}</h2>
        {initial && <Link href="/admin/library" className="link">Cancel edit</Link>}
      </div>
      <input type="hidden" name="id" value={initial?.id ?? ""} />
      <label className="f">
        Title
        <input name="title" defaultValue={initial?.title} required minLength={3} maxLength={140}
          placeholder="Campus dining hall food handling rules" className="lb-in" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="f">
          Source
          <input name="source" defaultValue={initial?.source} required placeholder="Campus Health Office" className="lb-in" />
        </label>
        <label className="f">
          Link <span className="font-normal text-ink-2">(optional)</span>
          <input name="url" type="url" defaultValue={initial?.url ?? ""} placeholder="https://" className="lb-in" />
        </label>
      </div>
      <label className="f">
        Text
        <textarea ref={bodyRef} name="body" defaultValue={initial?.body} rows={12} required minLength={80}
          placeholder="Paste the guidance here. Separate topics with a blank line; each paragraph becomes a searchable passage."
          className="lb-in font-normal" />
      </label>
      <label className="f">
        Or upload a text file
        <input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={onFile} className="text-sm font-normal" />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className="btn">{pending ? "Saving and indexing…" : initial ? "Save changes" : "Add to library"}</button>
        {state?.saved && <span role="status" className="badge fresh reveal">{state.saved}</span>}
        {state?.error && <span role="alert" className="badge crit">{state.error}</span>}
      </div>
    </form>
  );
}
