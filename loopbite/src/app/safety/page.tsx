import { Suspense } from "react";
import Form from "next/form";
import Link from "next/link";
import { db } from "@/db";
import { safetyQuestions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { answerQuestion, type AnswerMode } from "@/lib/rag/answer";
import { getLibrary } from "@/lib/rag/library";
import { AppHeader } from "@/components/AppHeader";

type SearchParams = Promise<{ q?: string }>;

const SUGGESTIONS = [
  "Can I donate pasta from the lunch buffet?",
  "How long can I keep leftovers in the fridge?",
  "Can I freeze it for a few weeks?",
  "When should I see a doctor for food poisoning?",
];

const MODE_TEXT: Record<AnswerMode, string> = {
  claude: "Answered by Claude, using only the sources on the right for food-safety facts.",
  extractive: "Showing the closest passage. Add an Anthropic API key for written answers.",
  fallback: "Claude's answer wasn't available or wasn't backed by a source, so this is the closest passage.",
  declined: "The library doesn't cover this, so the assistant didn't guess.",
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
  const { chunks } = await getLibrary();
  const docCount = new Set(chunks.map((c) => c.docSlug)).size;

  return (
    <>
      <AppHeader name={user.name} role={user.role} businessName={user.businessName} />
      <main className="mx-auto max-w-[1120px] px-5 py-8">
        <h1 className="text-3xl font-bold md:text-4xl">Food safety</h1>
        <p className="mt-2 max-w-2xl text-ink-2">
          Answers come from LoopBite&apos;s safety library: {docCount} documents from USDA, FDA, CDC and others, split into {chunks.length} passages.
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
              <Link key={s} href={`/safety?q=${encodeURIComponent(s)}`} className="rounded-full border border-line px-3 py-1 text-sm hover:border-teal">{s}</Link>
            ))}
          </div>
        </Form>

        {question && (
          <Suspense key={question} fallback={<div className="panel mt-6"><span className="spin" aria-hidden="true" />Looking it up…</div>}>
            <AnswerView question={question} userId={user.id} />
          </Suspense>
        )}
      </main>
    </>
  );
}

async function AnswerView({ question, userId }: { question: string; userId: string }) {
  const a = await answerQuestion(question);
  await db.insert(safetyQuestions).values({
    userId, question, topSource: a.topRef, topScore: Math.round(a.topScore * 100), answered: a.covered, mode: a.mode,
  });

  const cited = new Set(a.cited);
  const parts = a.text.split(/(\[S\d+\])/g);

  return (
    <div className="reveal mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <section className={`panel ${a.covered ? "border-teal" : "border-gold"}`}>
        <h2 className="text-xl font-bold">Answer</h2>
        <p className="mt-3 whitespace-pre-line text-lg leading-relaxed">
          {parts.map((p, i) => {
            const m = p.match(/^\[(S\d+)\]$/);
            return m && cited.has(m[1])
              ? <a key={i} href={`#src-${m[1]}`} className="badge neutral mx-0.5 align-middle">{m[1]}</a>
              : <span key={i}>{p}</span>;
          })}
        </p>
        <p className="mt-4 text-sm text-ink-2">{MODE_TEXT[a.mode]} Guidance only, not legal advice.</p>
      </section>

      <section className="panel">
        <h2 className="text-xl font-bold">Sources</h2>
        {a.sources.length === 0 ? (
          <p className="mt-3 text-ink-2">Nothing in the library matched this question.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {a.sources.map((s) => (
              <li key={s.ref} id={`src-${s.ref}`} className={`rounded-xl border p-3 ${cited.has(s.ref) ? "border-teal bg-teal-soft" : "border-line"}`}>
                <b className="text-sm"><span className="badge neutral mr-1">{s.ref}</span>{s.title}</b>
                <p className="mt-2 text-sm">{s.text}</p>
                <p className="mt-1 text-xs text-ink-2">
                  {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer" className="link text-xs">{s.source}</a> : s.source}
                  {cited.has(s.ref) ? ", cited" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
