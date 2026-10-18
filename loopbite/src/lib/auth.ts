import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession, type Role } from "./session";

const HOME: Record<Role, string> = { donor: "/donor", student: "/feed", admin: "/admin" };

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      businessName: users.businessName,
      blockedAt: users.blockedAt,
      isAdmin: users.isAdmin,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  return user ?? null;
}

// For pages: send the visitor somewhere sensible
export async function requireRole(role: Role) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasRole(user, role)) redirect(HOME[user.role]);
  return user;
}

// For server actions: refuse outright (the "403")
export async function assertRole(role: Role) {
  const user = await getCurrentUser();
  if (!user || !hasRole(user, role)) throw new Error("Forbidden");
  return user;
}

// For pages any signed-in user can open
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// A user counts as an admin if they're a staff admin or have admin access switched on
export function hasRole(user: { role: Role; isAdmin: boolean }, role: Role) {
  return user.role === role || (role === "admin" && user.isAdmin);
}
