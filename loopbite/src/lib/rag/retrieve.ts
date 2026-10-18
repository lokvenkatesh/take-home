// Splits documents into chunks and scores them with BM25.
// At this size, an in-memory index is fast. At scale: embeddings in pgvector plus BM25 (hybrid search).

export type Chunk = { ref: string; docSlug: string; title: string; source: string; url: string | null; text: string };

// Paragraphs are merged into chunks of up to ~700 characters, so each chunk is about one idea
export function chunkText(body: string, max = 700): string[] {
  const paras = body.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const p of paras) {
    if (cur && cur.length + p.length + 1 > max) { out.push(cur); cur = p; }
    else cur = cur ? `${cur} ${p}` : p;
  }
  if (cur) out.push(cur);
  return out;
}

const STOP = new Set(["a","an","the","and","or","of","to","in","on","is","it","i","my","can","for","be","do","does","with","that","this","how","what","if","are","we","our","you","at","from","still","much","long","should","there","any","was","has","me","about","will","its","when","where","which","who","would","could"]);
// Everyday words mapped to the words the guidance uses
const SYN: Record<string, string> = {
  warm: "hot", warmer: "hot", heat: "hot", hotter: "hot",
  fridge: "refriger", refrigerat: "refriger", refrigerator: "refriger", chill: "cold", chilled: "cold", cooler: "cooler",
  freeze: "freez", freezer: "freez", frozen: "freez", freezing: "freez",
  sue: "liabili", sued: "liabili", lawsuit: "liabili", legal: "liabili", law: "liabili", liable: "liabili", liability: "liabili",
  allergy: "allergen", allergies: "allergen", allergic: "allergen", allergens: "allergen",
  expired: "date", expir: "date", expiration: "date", bbd: "date",
  sick: "symptom", ill: "symptom", poisoning: "poison", vomit: "symptom", vomiting: "symptom", diarrhea: "symptom",
  customer: "served", plate: "served", buffet: "buffet", salad: "buffet",
  fruit: "produce", fruits: "produce", vegetable: "produce", vegetables: "produce", veggies: "produce", wash: "wash", washing: "wash",
  reheat: "reheat", reheating: "reheat", microwave: "reheat",
  leftover: "leftover", leftovers: "leftover",
  pickup: "pickup", pick: "pickup",
};
// Too common in this domain to tell chunks apart
const STOP_STEMS = new Set(["donat","donate","food","give","need","ok","town","someone","put","get","us","keep","safe"]);

export function tokenize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9° ]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w)).map((w) => {
    if (SYN[w]) return SYN[w];
    if (w.length > 4) w = w.replace(/(ing|ed|es|s)$/, "");
    if (w.length > 7) w = w.slice(0, 7);
    return SYN[w] ?? w;
  }).filter((w) => !STOP_STEMS.has(w));
}

export type Index = { chunks: { chunk: Chunk; tf: Map<string, number>; len: number }[]; df: Map<string, number>; avgLen: number; n: number };

export function buildIndex(chunks: Chunk[]): Index {
  const items = chunks.map((chunk) => {
    // The title counts twice, since it says what the chunk is about
    const tokens = tokenize(`${chunk.title} ${chunk.title} ${chunk.text}`);
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    return { chunk, tf, len: tokens.length };
  });
  const df = new Map<string, number>();
  for (const it of items) for (const t of it.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const avgLen = items.reduce((s, it) => s + it.len, 0) / Math.max(1, items.length);
  return { chunks: items, df, avgLen, n: items.length };
}

export type Hit = { chunk: Chunk; score: number; matched: number };

export function search(index: Index, query: string, k = 4): Hit[] {
  const terms = [...new Set(tokenize(query))];
  const k1 = 1.4, b = 0.75;
  return index.chunks.map(({ chunk, tf, len }) => {
    let score = 0, matched = 0;
    for (const t of terms) {
      const f = tf.get(t); if (!f) continue;
      matched++;
      const df = index.df.get(t)!;
      const idf = Math.log(1 + (index.n - df + 0.5) / (df + 0.5));
      score += (idf * f * (k1 + 1)) / (f + k1 * (1 - b + (b * len) / index.avgLen));
    }
    return { chunk, score, matched };
  }).sort((a, b) => b.score - a.score).slice(0, k);
}

// A strong enough match to answer from the library without Claude
export const MIN_SCORE = 2;
export function isCovered(hits: Hit[]) {
  const top = hits[0];
  if (!top || top.score < MIN_SCORE) return false;
  if (top.matched < 2 && top.score < 4) return false;
  return true;
}
