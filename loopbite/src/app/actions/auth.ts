"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, deleteSession } from "@/lib/session";
import { clientIp, limitLogin, rateLimit, tooMany } from "@/lib/rate-limit";

export type FormState = { error?: string } | undefined;

const HOME = { donor: "/donor", student: "/feed", admin: "/admin" } as const;

const emailField = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email"));

const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  email: emailField,
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["donor", "student"]), // admin can never be chosen here
  businessName: z.string().trim().optional(),
});

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { name, email, password, role, businessName } = parsed.data;
  const signupLimit = await rateLimit(`signup:ip:${await clientIp()}`, 5, 60 * 60);
  if (!signupLimit.ok) return { error: tooMany(signupLimit.retryAfterSec) };

  if (role === "donor" && !businessName) {
    return { error: "Donors need a business name" };
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) return { error: "An account with that email already exists" };

  const [user] = await db
    .insert(users)
    .values({
      name,
      email,
      role,
      passwordHash: await bcrypt.hash(password, 10),
      businessName: role === "donor" ? businessName : null,
    })
    .returning({ id: users.id, role: users.role });

  await createSession({ userId: user.id, role: user.role });
  redirect(HOME[user.role]);
}

const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password"),
});

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const limited = await limitLogin(parsed.data.email);
  if (limited) return { error: limited };

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return { error: "Email or password is incorrect" };
  }

  await createSession({ userId: user.id, role: user.role });
  redirect(user.mustChangePassword ? "/account?first=1" : HOME[user.role]);
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}