// Fires two claims on the same listing at the same moment, from two different students
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { listings, users } from "@/db/schema";
import { claimListingFor } from "@/lib/claims";

async function main() {
  const [listing] = await db
    .select()
    .from(listings)
    .where(and(eq(listings.status, "available"), gt(listings.expiresAt, new Date())))
    .limit(1);
  const students = await db.select().from(users).where(eq(users.role, "student")).limit(2);

  if (!listing || students.length < 2) {
    console.log("Need one available listing and two students. Run npm run db:seed first.");
    process.exit(1);
  }

  console.log(`Two students claim "${listing.title}" at the same time...`);
  const results = await Promise.allSettled(students.map((s) => claimListingFor(s.id, listing.id)));

  results.forEach((r, i) => {
    const who = students[i].name;
    console.log(r.status === "fulfilled" ? `  ${who}: WON (claim ${r.value})` : `  ${who}: lost (${(r.reason as Error).message})`);
  });

  const winners = results.filter((r) => r.status === "fulfilled").length;
  console.log(winners === 1 ? "PASS: exactly one winner" : `FAIL: ${winners} winners`);
  process.exit(winners === 1 ? 0 : 1);
}

main();
