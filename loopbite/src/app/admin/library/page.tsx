import { Suspense } from "react";
import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { safetyChunks, safetyDocs, safetyQuestions } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { deleteSafetyDoc, loadStarterLibrary, toggleSafetyDoc } from "@/app/actions/library";
import { AppHeader } from "@/components/AppHeader";
import { SafetyDocForm } from "@/components/SafetyDocForm";

type SearchParams = Promise<{ edit?: string }>;

export default function LibraryPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<p className="p-6">Loading…</p>}>
      <Library searchParams={searchParams} />
    </Suspense>
  );
}

async function Library({ searchParams }: { searchParams: SearchParams }) {
  const admin = await requireRole("admin");
  const { edit } = await searchParams;

  const docs = await db
    .select({ d: safetyDocs, chunks: count(safetyChunks.id) })
    .from(safetyDocs)
    .leftJoin(safetyChunks, eq(safetyChunks.docId, safetyDocs.id))
    .groupBy(safetyDocs.id)
    .orderBy(desc(safetyDocs.updatedAt));
  const editing = edit ? docs.find((x) => x.d.id === edit)?.d : undefined;

  const gaps = await db
    .select()
    .from(safetyQuestions)
    .where(eq(safetyQuestions.answered, false))
    .orderBy(desc(safetyQuestions.createdAt))
    .limit(10);

  const active = docs.filter((x) => x.d.active);
  const passages = active.reduce((s, x) => s + x.chunks, 0);

  return (
    <>
      <AppHeader name={admin.name} role={admin.role} />
      <main className="mx-auto max-w-[1120px] px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">Safety library</h1>
            <p className="mt-2 max-w-2xl text-ink-2">
              The assistant answers food-safety questions only from these documents. {active.length} active documents, {passages} searchable passages.
              Changes take effect on the next question.
            </p>
          </div>
          <form action={loadStarterLibrary}>
            <button className="btn ghost">{docs.length ? "Refresh starter documents" : "Load starter library"}</button>
          </form>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <SafetyDocForm initial={editing ? { id: editing.id, title: editing.title, source: editing.source, url: editing.url, body: editing.body } : undefined} />

          <section className="panel">
            <h2 className="text-xl font-bold">Questions the library couldn&apos;t answer</h2>
            <p className="mt-1 text-sm text-ink-2">Add a document that covers these, and the assistant can answer them next time.</p>
            {gaps.length === 0 ? (
              <p className="mt-3 text-ink-2">None yet.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {gaps.map((g) => <li key={g.id}><span className="badge lock mr-2">Gap</span>{g.question}</li>)}
              </ul>
            )}
          </section>
        </div>

        <section className="panel mt-6 overflow-x-auto">
          <h2 className="text-xl font-bold">Documents</h2>
          {docs.length === 0 ? (
            <p className="mt-3 text-ink-2">The library is empty. Load the starter library or add a document.</p>
          ) : (
            <table className="mt-3 w-full text-left text-sm">
              <thead className="text-ink-2">
                <tr className="border-b border-line">
                  <th className="py-2 pr-3">Document</th><th className="pr-3">Passages</th><th className="pr-3">Status</th><th />
                </tr>
              </thead>
              <tbody>
                {docs.map(({ d, chunks }) => (
                  <tr key={d.id} className="border-b border-line align-top">
                    <td className="py-3 pr-3">
                      <b>{d.title}</b>
                      <span className="block text-ink-2">
                        {d.url ? <a href={d.url} target="_blank" rel="noopener noreferrer" className="link text-sm">{d.source}</a> : d.source}
                      </span>
                    </td>
                    <td className="py-3 pr-3">{chunks}</td>
                    <td className="py-3 pr-3">{d.active ? <span className="badge fresh">Active</span> : <span className="badge neutral">Off</span>}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/admin/library?edit=${d.id}`} className="btn ghost sm">Edit</Link>
                        <form action={toggleSafetyDoc}>
                          <input type="hidden" name="id" value={d.id} />
                          <button className="btn ghost sm">{d.active ? "Turn off" : "Turn on"}</button>
                        </form>
                        <form action={deleteSafetyDoc}>
                          <input type="hidden" name="id" value={d.id} />
                          <button className="btn danger sm">Delete</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </>
  );
}
