// Retrieval evaluation: does the right source come back, and are off-topic questions declined?
import { EVAL_ANSWERABLE, EVAL_DECLINE } from "@/lib/rag/corpus";
import { isCovered, retrieve } from "@/lib/rag/retrieve";

let found = 0;
let answered = 0;
console.log("\nShould answer (expected source in top 3):");
for (const [q, expected] of EVAL_ANSWERABLE) {
  const hits = retrieve(q);
  const ok = hits.some((h) => h.doc.id === expected);
  const covered = isCovered(hits);
  found += ok ? 1 : 0;
  answered += covered ? 1 : 0;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${covered ? "answers " : "DECLINES"}  ${q}  ->  ${hits.map((h) => `${h.doc.id} ${h.score.toFixed(2)}`).join(", ")}`);
}

let declined = 0;
console.log("\nShould decline:");
for (const q of EVAL_DECLINE) {
  const hits = retrieve(q);
  const ok = !isCovered(hits);
  declined += ok ? 1 : 0;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${q}  ->  best ${hits[0].doc.id} ${hits[0].score.toFixed(2)}`);
}

console.log(`\nRecall@3: ${found}/${EVAL_ANSWERABLE.length}   Answered: ${answered}/${EVAL_ANSWERABLE.length}   Declined off-topic: ${declined}/${EVAL_DECLINE.length}\n`);
process.exit(found === EVAL_ANSWERABLE.length && declined === EVAL_DECLINE.length ? 0 : 1);
