"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { resetPasswordWithToken, sendPasswordResetEmail } from "@/lib/password-reset";

export type ForgotState = { message?: string } | undefined;

// Same reply whether or not the account exists, so it can't be used to check emails
export async function requestPasswordReset(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const generic = { message: "If an account exists for that email, we've sent a link to reset the password. Check your inbox and spam folder." };
  if (!email.includes("@")) return { message: "Enter the email you signed up with." };

  const [byEmail, byIp] = await Promise.all([
    rateLimit(`reset:email:${email}`, 3, 60 * 60),
    rateLimit(`reset:ip:${await clientIp()}`, 10, 60 * 60),
  ]);
  if (!byEmail.ok || !byIp.ok) return { message: tooMany(Math.max(byEmail.retryAfterSec, byIp.retryAfterSec)) };

  const [u] = await db.select({ id: users.id, email: users.email, name: users.name }).from(users).where(eq(users.email, email)).limit(1);
  if (u) {
    try { await sendPasswordResetEmail(u); } catch (e) { console.error("Couldn't send the password reset email.", e); }
  }
  return generic;
}

export type ResetState = { error?: string } | undefined;

const input = z
  .object({
    token: z.string().min(20, "This link is incomplete. Open it straight from the email."),
    password: z.string().min(8, "Your new password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "The passwords don't match" });

export async function resetPassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const limit = await rateLimit(`reset:submit:${await clientIp()}`, 20, 60 * 60);
  if (!limit.ok) return { error: tooMany(limit.retryAfterSec) };

  const parsed = input.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const result = await resetPasswordWithToken(parsed.data.token, parsed.data.password);
  if (!result.ok) {
    return {
      error:
        result.reason === "expired" ? "This link has expired. Links work for 1 hour, so request a new one."
        : result.reason === "used" ? "This link was already used. Request a new one if you still need to reset your password."
        : "This link doesn't work. Request a new one.",
    };
  }
  redirect(`/login?email=${encodeURIComponent(result.email)}&reset=1`);
}
