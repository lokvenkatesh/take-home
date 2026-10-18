"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, count, eq, ne, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { assertRole } from "@/lib/auth";

const refresh = () => revalidatePath("/admin", "layout");

// Give or remove admin access. It's added on top of their student or café role.
export async function setAdminAccess(formData: FormData) {
  const admin = await assertRole("admin");
  const userId = z.uuid().parse(formData.get("userId"));
  const grant = formData.get("grant") === "1";
  if (userId === admin.id) return; // nobody changes their own access

  const [person] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!person || person.role === "admin") return; // staff admins are managed separately

  if (grant) {
    await db.update(users).set({ isAdmin: true, blockedAt: null }).where(eq(users.id, userId));
  } else {
    // Always keep at least one admin (staff admins plus anyone with admin access)
    const [{ others }] = await db
      .select({ others: count() })
      .from(users)
      .where(and(or(eq(users.role, "admin"), eq(users.isAdmin, true)), ne(users.id, userId)));
    if (others === 0) return;
    await db.update(users).set({ isAdmin: false }).where(eq(users.id, userId));
  }
  refresh();
}

export type CreateAccountState =
  | { error?: string; created?: { name: string; email: string; password: string; role: string } }
  | undefined;

const input = z.object({
  name: z.string().trim().min(2, "Enter their name"),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
  role: z.enum(["student", "donor", "admin"]),
  businessName: z.string().trim().optional(),
});

// Admin creates an account and gets a one-time temporary password to pass on
export async function createAccount(_prev: CreateAccountState, formData: FormData): Promise<CreateAccountState> {
  await assertRole("admin");
  const parsed = input.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { name, email, role, businessName } = parsed.data;
  if (role === "donor" && !businessName) return { error: "Cafés need a business name." };

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return { error: "An account with that email already exists." };

  const password = randomBytes(9).toString("base64url"); // 12 random characters
  await db.insert(users).values({
    name,
    email,
    role,
    passwordHash: await bcrypt.hash(password, 10),
    businessName: role === "donor" ? businessName : null,
    mustChangePassword: true,
  });

  refresh();
  return { created: { name, email, password, role } };
}
