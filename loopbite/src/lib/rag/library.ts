import "server-only";
import { asc, count, eq, max } from "drizzle-orm";
import { db } from "@/db";
import { safetyChunks, safetyDocs } from "@/db/schema";
import { buildIndex, chunkText, type Chunk, type Index } from "./retrieve";
import { SEED_DOCS } from "./seed-docs";

// The index is rebuilt only when the library changes (a doc added, edited, turned off or deleted)
let cached: { version: string; index: Index; chunks: Chunk[] } | null = null;

export async function getLibrary() {
  const [v] = await db
    .select({ n: count(), latest: max(safetyDocs.updatedAt) })
    .from(safetyDocs)
    .where(eq(safetyDocs.active, true));
  const version = `${v.n}:${v.latest ? new Date(v.latest).toISOString() : "none"}`;
  if (cached?.version === version) return cached;

  const rows = await db
    .select({ id: safetyChunks.id, text: safetyChunks.text, slug: safetyDocs.slug, title: safetyDocs.title, source: safetyDocs.source, url: safetyDocs.url })
    .from(safetyChunks)
    .innerJoin(safetyDocs, eq(safetyDocs.id, safetyChunks.docId))
    .where(eq(safetyDocs.active, true))
    .orderBy(asc(safetyChunks.id));

  const chunks: Chunk[] = rows.map((r) => ({ ref: `S${r.id}`, docSlug: r.slug, title: r.title, source: r.source, url: r.url, text: r.text }));
  cached = { version, index: buildIndex(chunks), chunks };
  return cached;
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);

// Create or update a document, then re-chunk it
export async function saveDoc(
  input: { id?: string; slug?: string; title: string; source: string; url: string | null; body: string },
  createdBy: string | null,
) {
  return db.transaction(async (tx) => {
    let docId = input.id;
    if (docId) {
      await tx.update(safetyDocs)
        .set({ title: input.title, source: input.source, url: input.url, body: input.body, updatedAt: new Date() })
        .where(eq(safetyDocs.id, docId));
      await tx.delete(safetyChunks).where(eq(safetyChunks.docId, docId));
    } else {
      const slug = input.slug ?? `${slugify(input.title)}-${Date.now().toString(36).slice(-4)}`;
      const [doc] = await tx.insert(safetyDocs)
        .values({ slug, title: input.title, source: input.source, url: input.url, body: input.body, createdBy })
        .returning({ id: safetyDocs.id });
      docId = doc.id;
    }
    const parts = chunkText(input.body);
    if (parts.length) await tx.insert(safetyChunks).values(parts.map((text, position) => ({ docId: docId!, position, text })));
    return { docId: docId!, chunks: parts.length };
  });
}

// Load or refresh the starter library. Documents admins added are untouched.
export async function seedLibrary() {
  let n = 0;
  for (const d of SEED_DOCS) {
    const [existing] = await db.select({ id: safetyDocs.id }).from(safetyDocs).where(eq(safetyDocs.slug, d.slug)).limit(1);
    await saveDoc({ id: existing?.id, slug: d.slug, title: d.title, source: d.source, url: d.url, body: d.body }, null);
    n++;
  }
  return n;
}
