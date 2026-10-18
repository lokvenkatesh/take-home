import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIndex, chunkText, isCovered, search, tokenize, type Chunk } from "@/lib/rag/retrieve";
import { EVAL_ANSWERABLE, EVAL_DECLINE, SEED_DOCS } from "@/lib/rag/seed-docs";

test("chunking: long paragraphs become separate chunks, short ones are merged", () => {
  const long = "word ".repeat(80).trim(); // ~400 characters
  assert.equal(chunkText(`${long}\n\n${long}\n\n${long}`).length, 3);
  assert.equal(chunkText("Short one.\n\nShort two.").length, 1);
});

test("tokenizer: everyday words map to the guidance's words", () => {
  assert.deepEqual(tokenize("fridge"), tokenize("refrigerator"));
  assert.deepEqual(tokenize("frozen"), tokenize("freezer"));
});

let n = 1;
const chunks: Chunk[] = SEED_DOCS.flatMap((d) =>
  chunkText(d.body).map((text) => ({ ref: `S${n++}`, docSlug: d.slug, title: d.title, source: d.source, url: d.url, text })),
);
const index = buildIndex(chunks);

for (const [q, expected] of EVAL_ANSWERABLE) {
  test(`retrieval finds the right document: ${q}`, () => {
    assert.ok(search(index, q, 3).some((h) => expected.includes(h.chunk.docSlug)));
  });
}

for (const q of EVAL_DECLINE) {
  test(`retrieval declines off-topic questions: ${q}`, () => {
    assert.equal(isCovered(search(index, q, 3)), false);
  });
}
