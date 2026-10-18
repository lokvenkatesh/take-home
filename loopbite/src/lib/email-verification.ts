import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { emailTokens, users } from "@/db/schema";
import { sendEmail } from "./email";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const DAY = 24 * 60 * 60 * 1000;

// The site's address, for building the link. APP_URL wins if it's set.
export async function appUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function sendVerificationEmail(user: { id: string; email: string; name: string }) {
  const token = randomBytes(32).toString("base64url");
  await db.insert(emailTokens).values({
    userId: user.id,
    tokenHash: hash(token), // the token itself is never stored
    purpose: "verify",
    expiresAt: new Date(Date.now() + DAY),
  });

  const link = `${await appUrl()}/verify?token=${token}`;
  const first = user.name.split(" ")[0];
  await sendEmail({
    to: user.email,
    subject: "Confirm your LoopBite email",
    text: `Hi ${first},\n\nConfirm your email to start using LoopBite:\n${link}\n\nThis link works for 24 hours. If you didn't sign up, you can ignore this email.\n\nLoopBite`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px;color:#10252a">
      <h2 style="color:#0f5c63;margin:0 0 12px">Confirm your email</h2>
      <p>Hi ${first}, thanks for joining LoopBite. Confirm your email to start finding campus leftovers before they're gone.</p>
      <p style="margin:28px 0"><a href="${link}" style="background:#0f5c63;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Confirm my email</a></p>
      <p style="font-size:13px;color:#4d6266">This link works for 24 hours. If you didn't sign up, you can ignore this email.</p>
    </div>`,
  });
}

export async function verifyEmailToken(token: string): Promise<{ ok: true; email: string } | { ok: false; reason: "invalid" | "expired" }> {
  const [row] = await db
    .select({ id: emailTokens.id, userId: emailTokens.userId, expiresAt: emailTokens.expiresAt, usedAt: emailTokens.usedAt, email: users.email })
    .from(emailTokens)
    .innerJoin(users, eq(users.id, emailTokens.userId))
    .where(and(eq(emailTokens.tokenHash, hash(token)), eq(emailTokens.purpose, "verify")))
    .limit(1);

  if (!row) return { ok: false, reason: "invalid" };
  // Already used (some email scanners open links automatically): the email is confirmed either way
  if (row.usedAt) return { ok: true, email: row.email };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };

  await db.transaction(async (tx) => {
    await tx.update(emailTokens).set({ usedAt: new Date() }).where(eq(emailTokens.id, row.id));
    await tx.update(users).set({ emailVerifiedAt: new Date() }).where(and(eq(users.id, row.userId), isNull(users.emailVerifiedAt)));
  });
  return { ok: true, email: row.email };
}
