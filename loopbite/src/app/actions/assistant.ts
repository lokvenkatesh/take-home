"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { listings, safetyQuestions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit, tooMany } from "@/lib/rate-limit";
import { answerQuestion, type AnswerMode, type ChatTurn, type ListingContext, type Source } from "@/lib/rag/answer";
import { listingQuery } from "@/lib/ai/listing-insight";
import { formatMinutes } from "@/lib/listings";

export type AssistantReply = {
  text: string;
  cited: string[];
  mode: AnswerMode;
  covered: boolean;
  sources: (Source & { cited: boolean })[];
};

export async function askAssistant(
  question: string,
  listingId?: string,
  history: ChatTurn[] = [],
): Promise<AssistantReply | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to chat with the assistant." };

  const chatLimit = await rateLimit(`ai:chat:${user.id}`, 30, 60 * 60);
  if (!chatLimit.ok) return { error: `You've sent a lot of messages. ${tooMany(chatLimit.retryAfterSec)}` };

  const q = String(question ?? "").trim().slice(0, 500);
  if (q.length < 2) return { error: "Type a message first." };

  // History comes from the browser, so check its shape
  const safeHistory = (Array.isArray(history) ? history : [])
    .filter((h) => (h?.role === "user" || h?.role === "assistant") && typeof h.text === "string")
    .slice(-8);

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
        query: listingQuery(l),
      };
    }
  }

  const a = await answerQuestion(q, { listing, history: safeHistory });

  // Logged, so admins can see what the library doesn't cover yet
  await db.insert(safetyQuestions).values({
    userId: user.id,
    question: q,
    topSource: a.topRef,
    topScore: Math.round(a.topScore * 100),
    answered: a.covered,
    mode: a.mode,
  });

  return {
    text: a.text, cited: a.cited, mode: a.mode, covered: a.covered,
    sources: a.sources.map((s) => ({ ...s, cited: a.cited.includes(s.ref) })),
  };
}
