import { SAFETY_DOCS, type SafetyDoc } from "./corpus";

// BM25 keyword retrieval. The corpus is small, so it runs in memory in a few microseconds.
// The upgrade path at scale: embeddings in pgvector, combined with this keyword score (hybrid search).

const STOP = new Set(["a","an","the","and","or","of","to","in","on","is","it","i","my","can","for","be","do","does","with","that","this","how","what","if","are","we","our","you","at","from","still","much","long","should","there","any","was","has"]);
// Words people use that the guidance phrases differently
const SYN: Record<string, string> = {
  warm: "hot", warmer: "hot", heat: "hot", fridge: "cold", chilled: "cold", refriger: "cold", cooler: "cold",
  sue: "liabili", sued: "liabili", lawsuit: "liabili", legal: "liabili", law: "liabili", liable: "liabili",
  allerg: "allergen", expir: "date", expired: "date", bbd: "date", leftover: "served", plate: "served",
  customer: "served", salad: "buffet", reheat: "reheat", drive: "transport", deliver: "transport", car: "transport",
};
// Stems too common in this domain to tell documents apart
const STOP_STEMS = new Set(["donat","donate","food","give","need","ok","town","someone","put","get","could","would","who","which","us"]);

export function tokenize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9° ]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w))
    .map((w) => {
      if (SYN[w]) return SYN[w];
      if (w.length > 4) w = w.replace(/(ing|ed|es|s)$/, ""); // light stemming: donated -> donat (short words like "need" stay)
      if (w.length > 7) w = w.slice(0, 7);
      return SYN[w] ?? w;
    })
    .filter((w) => !STOP_STEMS.has(w));
}

type Indexed = { doc: SafetyDoc; tf: Map<string, number>; len: number };

const index = (() => {
  const docs: Indexed[] = SAFETY_DOCS.map((doc) => {
    // Titles count twice, since they say what the chunk is about
    const tokens = tokenize(`${doc.title} ${doc.title} ${doc.text}`);
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    return { doc, tf, len: tokens.length };
  });
  const df = new Map<string, number>();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const avgLen = docs.reduce((s, d) => s + d.len, 0) / docs.length;
  return { docs, df, avgLen, n: docs.length };
})();

export type Hit = { doc: SafetyDoc; score: number; matched: number };

export function retrieve(query: string, k = 3): Hit[] {
  const terms = [...new Set(tokenize(query))];
  const k1 = 1.4, b = 0.75;
  return index.docs
    .map(({ doc, tf, len }) => {
      let score = 0, matched = 0;
      for (const t of terms) {
        const f = tf.get(t);
        if (!f) continue;
        matched++;
        const df = index.df.get(t)!;
        const idf = Math.log(1 + (index.n - df + 0.5) / (df + 0.5));
        score += (idf * f * (k1 + 1)) / (f + k1 * (1 - b + (b * len) / index.avgLen));
      }
      return { doc, score, matched };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

// Decline instead of guessing when the best match is weak
export const MIN_SCORE = 1.5;
export function isCovered(hits: Hit[]) {
  const top = hits[0];
  if (!top || top.score < MIN_SCORE) return false;
  if (top.matched < 2 && top.score < 4) return false; // one matching word isn't enough
  return true;
}
