"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { getListingInsight, type InsightResult } from "@/app/actions/insight";
import { AssistantChat } from "./AssistantChat";
import { INSIGHT_EVENT } from "./InsightButton";

function Cited({ text, cited }: { text: string; cited: Set<string> }) {
  return (
    <>
      {text.split(/(\[S\d{1,2}\])/g).map((p, i) => {
        const m = p.match(/^\[(S\d{1,2})\]$/);
        return m && cited.has(m[1])
          ? <span key={i} className="badge neutral mx-0.5 align-middle">{m[1]}</span>
          : <span key={i}>{p}</span>;
      })}
    </>
  );
}

export function InsightDrawer() {
  const [listingId, setListingId] = useState<string | null>(null);
  const [result, setResult] = useState<InsightResult | null>(null);
  const [pending, startTransition] = useTransition();
  const current = useRef<string | null>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      current.current = id;
      setListingId(id);
      setResult(null);
      startTransition(async () => {
        const r = await getListingInsight(id);
        if (current.current === id) setResult(r); // ignore answers for a card you've moved on from
      });
    };
    window.addEventListener(INSIGHT_EVENT, onOpen);
    return () => window.removeEventListener(INSIGHT_EVENT, onOpen);
  }, []);

  const close = () => { current.current = null; setListingId(null); };

  useEffect(() => {
    if (!listingId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listingId]);

  const open = listingId !== null;
  const data = result && !("error" in result) ? result : null;
  const cited = new Set(data?.insight.cited ?? []);

  return (
    <>
      {open && <div className="assist-scrim" onClick={close} aria-hidden="true" />}
      <aside role="dialog" aria-label="AI details about this food" inert={!open} className={`assist-drawer ${open ? "open" : ""}`}>
        <div className="flex items-start justify-between gap-3 border-b border-line p-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-teal">
              <span className="ai-chip !cursor-default !p-0 !border-0 !bg-transparent">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9z" fill="currentColor" /></svg>
              </span>
              AI details
            </p>
            <p className="mt-1 font-display text-lg font-bold">{data ? data.title : open ? "Looking at this food…" : ""}</p>
            {data && <p className="text-sm text-ink-2">{data.donor}</p>}
          </div>
          <button type="button" onClick={close} className="link" aria-label="Close details">Close</button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {pending && !result && (
            <div className="space-y-3 p-4" aria-live="polite">
              <p className="text-sm text-ink-2"><span className="spin" aria-hidden="true" />Reading the listing and the safety guidance…</p>
              {[80, 60, 70].map((w) => <div key={w} className="h-4 animate-pulse rounded bg-line" style={{ width: `${w}%` }} />)}
            </div>
          )}

          {result && "error" in result && <p className="m-4 badge crit">{result.error}</p>}

          {data && (
            <div className="reveal space-y-4 p-4">
              <dl className="space-y-3">
                {data.insight.rows.map((r) => (
                  <div key={r.label}>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ink-2">{r.label}</dt>
                    <dd className="mt-0.5 text-sm leading-relaxed"><Cited text={r.text} cited={cited} /></dd>
                  </div>
                ))}
              </dl>

              {data.insight.cautions.length > 0 && (
                <ul className="space-y-1 rounded-xl border border-gold bg-gold-soft p-3 text-sm">
                  {data.insight.cautions.map((c) => <li key={c}><Cited text={c} cited={cited} /></li>)}
                </ul>
              )}

              {data.insight.sources.some((s) => s.cited) && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">Sources</p>
                  {data.insight.sources.filter((s) => s.cited).map((s) => (
                    <details key={s.id} className="mt-1 text-sm">
                      <summary className="cursor-pointer font-semibold text-teal">{s.id}: {s.title}</summary>
                      <p className="mt-1 text-xs">{s.text}</p>
                      <p className="text-xs text-ink-2">{s.source}</p>
                    </details>
                  ))}
                </div>
              )}

              <p className="text-xs text-ink-2">
                {data.insight.mode === "claude" ? "Written by Claude from the café's listing and LoopBite's safety library." : "Built from the café's listing and LoopBite's safety library."}{" "}
                Always check allergens with the café if you&apos;re unsure.
              </p>
            </div>
          )}
        </div>

        {/* Follow-up questions about this specific food */}
        {data && listingId && (
          <div className="flex max-h-[45%] min-h-[200px] flex-col border-t border-line">
            <p className="px-4 pt-3 text-sm font-semibold">Ask about this food</p>
            <AssistantChat
              key={listingId}
              listingId={listingId}
              intro="For example:"
              suggestions={["Can I keep this until tomorrow?", "How should I reheat it?"]}
            />
          </div>
        )}
      </aside>
    </>
  );
}
