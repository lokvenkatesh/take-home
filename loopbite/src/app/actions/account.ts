"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export type PasswordState = { error?: string; saved?: boolean } | undefined;

const input = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    next: z.string().min(8, "Your new password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, { message: "The new passwords don't match" })
  .refine((d) => d.next !== d.current, { message: "Choose a password different from your current one" });

export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const me = await getCurrentUser();
  if (!me) return { error: "Sign in again to change your password." };

  const parsed = input.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, me.id)).limit(1);
  if (!row || !(await bcrypt.compare(parsed.data.current, row.hash))) {
    return { error: "Your current password is incorrect." };
  }

  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(parsed.data.next, 10), mustChangePassword: false })
    .where(eq(users.id, me.id));
  return { saved: true };
}
