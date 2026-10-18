"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { listings, safetyQuestions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { answerQuestion, type AnswerMode, type ListingContext } from "@/lib/rag/answer";
import { sourceIdsFor } from "@/lib/ai/listing-insight";
import { formatMinutes } from "@/lib/listings";

export type AssistantReply = {
  text: string;
  cited: string[];
  mode: AnswerMode;
  covered: boolean;
  sources: { id: string; title: string; source: string; text: string; cited: boolean }[];
};

export async function askAssistant(question: string, listingId?: string): Promise<AssistantReply | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to ask questions." };

  const q = question.trim().slice(0, 300);
  if (q.length < 4) return { error: "Type a question first." };

  // Questions about a specific listing get its facts, plus the guidance that applies to it
  let listing: ListingContext | undefined;
  if (listingId && /^[0-9a-f-]{36}$/i.test(listingId)) {
    const [l] = await db.select().from(listings).where(eq(listings.id, listingId)).limit(1);
    if (l) {
      const goodFor = Math.max(0, Math.round((l.expiresAt.getTime() - Date.now()) / 60_000));
      listing = {
        text: [
          `Food: ${l.title}. ${l.description}`.trim(),
          `Amount: ${l.quantityText}, about ${l.estLbs} lb.`,
          `Stored: ${l.handling === "hot" ? "kept hot" : l.handling === "cold" ? "kept cold" : "room temperature"}.`,
          `Allergens listed: ${l.allergens.join(", ") || "none listed"}. Diet tags: ${l.dietary.join(", ") || "none"}.`,
          `Good for: ${goodFor > 0 ? `about ${formatMinutes(goodFor)} more, according to the café` : "expired"}.`,
        ].join("\n"),
        sourceIds: sourceIdsFor(l),
      };
    }
  }
  const a = await answerQuestion(q, listing);

  // Same log as the Food safety page, so admins see every question
  await db.insert(safetyQuestions).values({
    userId: user.id,
    question: q,
    topSource: a.hits[0]?.doc.id ?? null,
    topScore: Math.round((a.hits[0]?.score ?? 0) * 100),
    answered: a.covered,
    mode: a.mode,
  });

  const cited = new Set(a.cited);
  return {
    text: a.text,
    cited: a.cited,
    mode: a.mode,
    covered: a.covered,
    sources: a.hits
      .filter((h) => h.score > 0 || cited.has(h.doc.id))
      .map((h) => ({ id: h.doc.id, title: h.doc.title, source: h.doc.source, text: h.doc.text, cited: cited.has(h.doc.id) })),
  };
}
