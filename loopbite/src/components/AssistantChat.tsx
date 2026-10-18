"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { askAssistant, type AssistantReply } from "@/app/actions/assistant";

type Turn = { id: number; question: string; reply?: AssistantReply; error?: string };

const MODE_NOTE: Record<AssistantReply["mode"], string> = {
  claude: "Answered from LoopBite's safety library. Guidance only.",
  extractive: "Closest guidance from the library. Add an Anthropic API key for written answers.",
  fallback: "Showing the closest guidance from the library.",
  declined: "Not covered by the library, so the assistant didn't guess.",
};

// Other parts of the app can send a question with:
// window.dispatchEvent(new CustomEvent("loopbite:ask", { detail: "question" }))
export const ASK_EVENT = "loopbite:ask";

export function AssistantChat({
  suggestions,
  intro,
  listen = false,
  autoFocus = false,
  listingId,
}: {
  suggestions: string[];
  intro: string;
  listen?: boolean;
  autoFocus?: boolean;
  listingId?: string;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function ask(raw: string) {
    const question = raw.trim();
    if (!question || pending) return;
    const id = Date.now();
    setTurns((t) => [...t, { id, question }]);
    setText("");
    startTransition(async () => {
      const r = await askAssistant(question, listingId);
      setTurns((t) => t.map((x) => (x.id !== id ? x : "error" in r ? { ...x, error: r.error } : { ...x, reply: r })));
    });
  }

  // Keep the newest message in view
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Questions sent from elsewhere in the app, like the AI form fill's safety warnings
  useEffect(() => {
    if (!listen) return;
    const onAsk = (e: Event) => ask((e as CustomEvent<string>).detail);
    window.addEventListener(ASK_EVENT, onAsk);
    return () => window.removeEventListener(ASK_EVENT, onAsk);
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        {turns.length === 0 && (
          <div>
            <p className="text-sm text-ink-2">{intro}</p>
            <div className="mt-3 flex flex-col gap-2">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => ask(s)}
                  className="rounded-xl border border-line bg-surface px-3 py-2 text-left text-sm hover:border-teal">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t) => (
          <div key={t.id} className="space-y-2">
            <p className="reveal ml-8 rounded-2xl rounded-br-sm bg-teal px-3 py-2 text-sm text-[var(--on-teal)]">{t.question}</p>
            {t.error ? (
              <p className="badge crit">{t.error}</p>
            ) : !t.reply ? (
              <p className="text-sm text-ink-2"><span className="spin" aria-hidden="true" />Looking it up…</p>
            ) : (
              <ReplyBubble reply={t.reply} />
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); ask(text); }} className="flex gap-2 border-t border-line bg-surface p-3">
        <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} maxLength={300}
          placeholder="Ask about food safety…" aria-label="Your question" className="lb-in min-w-0 flex-1" />
        <button disabled={pending || !text.trim()} className="btn">Ask</button>
      </form>
    </div>
  );
}

function ReplyBubble({ reply }: { reply: AssistantReply }) {
  const cited = new Set(reply.cited);
  const parts = reply.text.split(/(\[S\d{1,2}\])/g);

  return (
    <div className={`reveal mr-8 rounded-2xl rounded-bl-sm border p-3 text-sm ${reply.covered ? "border-line bg-surface" : "border-gold bg-gold-soft"}`}>
      <p className="leading-relaxed">
        {parts.map((p, i) => {
          const m = p.match(/^\[(S\d{1,2})\]$/);
          return m && cited.has(m[1])
            ? <span key={i} className="badge neutral mx-0.5 align-middle">{m[1]}</span>
            : <span key={i}>{p}</span>;
        })}
      </p>
      {reply.sources.filter((s) => s.cited).map((s) => (
        <details key={s.id} className="mt-2">
          <summary className="cursor-pointer text-xs font-semibold text-teal">{s.id}: {s.title}</summary>
          <p className="mt-1 text-xs">{s.text}</p>
          <p className="text-xs text-ink-2">{s.source}</p>
        </details>
      ))}
      <p className="mt-2 text-xs text-ink-2">{MODE_NOTE[reply.mode]}</p>
    </div>
  );
}
