import { Suspense } from "react";
import Form from "next/form";
import Link from "next/link";
import { db } from "@/db";
import { safetyQuestions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { answerQuestion, type AnswerMode } from "@/lib/rag/answer";
import { EVAL_ANSWERABLE, EVAL_DECLINE, SAFETY_DOCS } from "@/lib/rag/corpus";
import { isCovered, retrieve } from "@/lib/rag/retrieve";
import { AppHeader } from "@/components/AppHeader";

type SearchParams = Promise<{ q?: string }>;

const SUGGESTIONS = [
  "Can I donate pasta from the lunch buffet?",
  "How long can hot soup wait for pickup?",
  "Could I get sued if someone gets sick?",
  "Can I donate crackers past the best by date?",
];

const MODE_TEXT: Record<AnswerMode, string> = {
  claude: "Answered by Claude, using only the sources on the right.",
  extractive: "Showing the closest guidance. Add an Anthropic API key for written answers.",
  fallback: "Claude's answer wasn't available or wasn't backed by a source, so this is the closest guidance.",
  declined: "No source matched closely enough, so the assistant declined instead of guessing.",
};

export default function SafetyPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<p className="p-6">Loading…</p>}>
      <Safety searchParams={searchParams} />
    </Suspense>
  );
}

async function Safety({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const { q } = await searchParams;
  const question = (q ?? "").trim().slice(0, 300);

  // The evaluation runs on every load. It's cheap, and it keeps the numbers honest.
  const recall = EVAL_ANSWERABLE.filter(([qq, id]) => retrieve(qq).some((h) => h.doc.id === id)).length;
  const declined = EVAL_DECLINE.filter((qq) => !isCovered(retrieve(qq))).length;

  return (
    <>
      <AppHeader name={user.name} role={user.role} businessName={user.businessName} />
      <main className="mx-auto max-w-[1120px] px-5 py-8">
        <h1 className="text-3xl font-bold md:text-4xl">Food safety assistant</h1>
        <p className="mt-2 max-w-2xl text-ink-2">
          Ask before you post or pick up. Answers come only from LoopBite&apos;s safety library, with sources you can check.
        </p>

        <Form action="/safety" className="panel mt-6">
          <label htmlFor="q" className="font-semibold">Your question</label>
          <div className="mt-2 flex flex-wrap gap-2">
            <input id="q" name="q" defaultValue={question} maxLength={300} required
              placeholder="Can I donate rice that's been in the warmer since lunch?" className="lb-in min-w-0 flex-1" />
            <button className="btn">Ask</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <Link key={s} href={`/safety?q=${encodeURIComponent(s)}`} className="rounded-full border border-line px-3 py-1 text-sm hover:border-teal">
                {s}
              </Link>
            ))}
          </div>
        </Form>

        {question && (
          <Suspense key={question} fallback={<div className="panel mt-6"><span className="spin" aria-hidden="true" />Looking it up…</div>}>
            <AnswerView question={question} userId={user.id} />
          </Suspense>
        )}

        <details className="panel mt-6">
          <summary className="cursor-pointer font-semibold">How this works and how it&apos;s tested</summary>
          <div className="mt-3 space-y-2 text-sm text-ink-2">
            <p>1. Your question is matched against {SAFETY_DOCS.length} short guidance passages using BM25 keyword scoring, and the top 3 are kept.</p>
            <p>2. If the best match is weak, the assistant declines instead of guessing.</p>
            <p>3. Otherwise Claude answers using only those passages and cites each one. Answers that cite nothing retrieved are discarded.</p>
            <p className="pt-2 text-ink">
              Test set: the right source is in the top 3 for <b>{recall} of {EVAL_ANSWERABLE.length}</b> questions,
              and <b>{declined} of {EVAL_DECLINE.length}</b> off-topic questions are declined.
            </p>
          </div>
        </details>
      </main>
    </>
  );
}

async function AnswerView({ question, userId }: { question: string; userId: string }) {
  const a = await answerQuestion(question);

  // Log it, so admins can see what the library doesn't cover yet
  await db.insert(safetyQuestions).values({
    userId,
    question,
    topSource: a.hits[0]?.doc.id ?? null,
    topScore: Math.round((a.hits[0]?.score ?? 0) * 100),
    answered: a.covered,
    mode: a.mode,
  });

  const cited = new Set(a.cited);
  const parts = a.text.split(/(\[S\d{1,2}\])/g);
  const shown = a.hits.filter((h) => h.score > 0 || cited.has(h.doc.id));

  return (
    <div className="reveal mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <section className={`panel ${a.covered ? "border-teal" : "border-gold"}`}>
        <h2 className="text-xl font-bold">Answer</h2>
        <p className="mt-3 text-lg leading-relaxed">
          {parts.map((p, i) => {
            const m = p.match(/^\[(S\d{1,2})\]$/);
            if (m && cited.has(m[1])) {
              return <a key={i} href={`#src-${m[1]}`} className="badge neutral mx-0.5 align-middle">{m[1]}</a>;
            }
            return <span key={i}>{p}</span>;
          })}
        </p>
        <p className="mt-4 text-sm text-ink-2">{MODE_TEXT[a.mode]} Guidance only, not legal advice. When in doubt, don&apos;t donate it.</p>
      </section>

      <section className="panel">
        <h2 className="text-xl font-bold">Sources</h2>
        {shown.length === 0 ? (
          <p className="mt-3 text-ink-2">Nothing in the library matched this question.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {shown.map((h) => (
              <li key={h.doc.id} id={`src-${h.doc.id}`}
                className={`rounded-xl border p-3 ${cited.has(h.doc.id) ? "border-teal bg-teal-soft" : "border-line"}`}>
                <div className="flex items-start justify-between gap-2">
                  <b className="text-sm"><span className="badge neutral mr-1">{h.doc.id}</span>{h.doc.title}</b>
                  <span className="shrink-0 text-xs text-ink-2">score {h.score.toFixed(1)}{cited.has(h.doc.id) ? ", cited" : ""}</span>
                </div>
                <p className="mt-2 text-sm">{h.doc.text}</p>
                <p className="mt-1 text-xs text-ink-2">{h.doc.source}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
