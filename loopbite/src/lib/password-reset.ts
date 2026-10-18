import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { emailTokens, users } from "@/db/schema";
import { sendEmail } from "./email";
import { appUrl } from "./email-verification";
import { SUPPORT_EMAIL } from "./support";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const HOUR = 60 * 60 * 1000;

export async function sendPasswordResetEmail(user: { id: string; email: string; name: string }) {
  const token = randomBytes(32).toString("base64url");
  await db.insert(emailTokens).values({
    userId: user.id,
    tokenHash: hash(token), // only the hash is stored
    purpose: "reset",
    expiresAt: new Date(Date.now() + HOUR),
  });

  const link = `${await appUrl()}/reset-password?token=${token}`;
  const first = user.name.split(" ")[0];
  await sendEmail({
    to: user.email,
    subject: "Reset your LoopBite password",
    text: `Hi ${first},\n\nUse this link to set a new LoopBite password:\n${link}\n\nIt works once and expires in 1 hour. If you didn't ask for this, you can ignore this email; your password won't change.\n\nNeed help? Email ${SUPPORT_EMAIL}\n\nLoopBite`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px;color:#10252a">
      <h2 style="color:#0f5c63;margin:0 0 12px">Reset your password</h2>
      <p>Hi ${first}, use the button below to set a new LoopBite password.</p>
      <p style="margin:28px 0"><a href="${link}" style="background:#0f5c63;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Set a new password</a></p>
      <p style="font-size:13px;color:#4d6266">It works once and expires in 1 hour. If you didn't ask for this, ignore this email; your password won't change.</p>
      <p style="font-size:13px;color:#4d6266">Need help? Email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
    </div>`,
  });
}

export type ResetResult = { ok: true; email: string } | { ok: false; reason: "invalid" | "expired" | "used" };

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<ResetResult> {
  const [row] = await db
    .select({ id: emailTokens.id, userId: emailTokens.userId, expiresAt: emailTokens.expiresAt, usedAt: emailTokens.usedAt, email: users.email })
    .from(emailTokens)
    .innerJoin(users, eq(users.id, emailTokens.userId))
    .where(and(eq(emailTokens.tokenHash, hash(token)), eq(emailTokens.purpose, "reset")))
    .limit(1);

  if (!row) return { ok: false, reason: "invalid" };
  if (row.usedAt) return { ok: false, reason: "used" };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.transaction(async (tx) => {
    await tx.update(users)
      .set({ passwordHash, mustChangePassword: false })
      .where(eq(users.id, row.userId));
    // The link proved they own the email, so it counts as confirmed too
    await tx.update(users).set({ emailVerifiedAt: new Date() }).where(and(eq(users.id, row.userId), isNull(users.emailVerifiedAt)));
    // Use up this link and any other open reset links for this account
    await tx.update(emailTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(emailTokens.userId, row.userId), eq(emailTokens.purpose, "reset"), isNull(emailTokens.usedAt)));
  });
  return { ok: true, email: row.email };
}
