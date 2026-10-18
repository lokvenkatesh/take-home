// Creates (or promotes) an admin with a random temporary password.
// Usage: npm run admin:create -- you@school.edu "Your Name"
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

async function main() {
  const [rawEmail, ...nameParts] = process.argv.slice(2);
  if (!rawEmail || !rawEmail.includes("@")) {
    console.log('Usage: npm run admin:create -- you@school.edu "Your Name"');
    process.exit(1);
  }
  const email = rawEmail.trim().toLowerCase();
  const name = nameParts.join(" ").trim() || email.split("@")[0];
  const password = randomBytes(9).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 10);

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    await db.update(users)
      .set({ role: "admin", passwordHash, mustChangePassword: true, blockedAt: null })
      .where(eq(users.id, existing.id));
  } else {
    await db.insert(users).values({ email, name, role: "admin", passwordHash, mustChangePassword: true });
  }

  console.log(`\nAdmin ready: ${email}`);
  console.log(`Temporary password: ${password}`);
  console.log("Sign in with it, and you'll be asked to set your own password.\n");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
