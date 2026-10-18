// Retrieval evaluation on the starter library: does the right document come back in the top 3?
import { EVAL_ANSWERABLE, EVAL_DECLINE, SEED_DOCS } from "@/lib/rag/seed-docs";
import { buildIndex, chunkText, isCovered, search, type Chunk } from "@/lib/rag/retrieve";

let n = 1;
const chunks: Chunk[] = SEED_DOCS.flatMap((d) =>
  chunkText(d.body).map((text) => ({ ref: `S${n++}`, docSlug: d.slug, title: d.title, source: d.source, url: d.url, text })),
);
const index = buildIndex(chunks);
console.log(`\n${SEED_DOCS.length} documents, ${chunks.length} passages\n\nShould find the right document:`);

let found = 0;
for (const [q, expected] of EVAL_ANSWERABLE) {
  const hits = search(index, q, 3);
  const ok = hits.some((h) => expected.includes(h.chunk.docSlug));
  found += ok ? 1 : 0;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${q}  ->  ${hits.map((h) => `${h.chunk.docSlug} ${h.score.toFixed(1)}`).join(", ")}`);
}
let declined = 0;
console.log("\nShould decline:");
for (const q of EVAL_DECLINE) {
  const ok = !isCovered(search(index, q, 3));
  declined += ok ? 1 : 0;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${q}`);
}
console.log(`\nRecall@3: ${found}/${EVAL_ANSWERABLE.length}   Declined off-topic: ${declined}/${EVAL_DECLINE.length}\n`);
process.exit(found === EVAL_ANSWERABLE.length && declined === EVAL_DECLINE.length ? 0 : 1);
