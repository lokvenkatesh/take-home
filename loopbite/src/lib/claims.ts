import { randomInt } from "node:crypto";
import { and, count, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { claims, listings, users } from "@/db/schema";

export const MAX_ACTIVE_CLAIMS = 2;

// No 0/O or 1/I, so codes are easy to read out at a counter
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function makeCode() {
  let s = "";
  for (let i = 0; i < 5; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `LB-${s}`;
}

// Errors we expect and show to the student (anything else is a real bug)
export class ClaimError extends Error {
  kind: "taken" | "other";
  constructor(message: string, kind: "taken" | "other" = "other") {
    super(message);
    this.kind = kind;
  }
}

export async function claimListingFor(studentId: string, listingId: string) {
  return db.transaction(async (tx) => {
    // 1. Lock this student's row so two claims from the same student run one at a time
    await tx.select({ id: users.id }).from(users).where(eq(users.id, studentId)).for("update");

    // 2. Enforce the claim limit
    const [{ active }] = await tx
      .select({ active: count() })
      .from(claims)
      .where(and(eq(claims.studentId, studentId), eq(claims.status, "active")));
    if (active >= MAX_ACTIVE_CLAIMS) {
      throw new ClaimError(`You can hold ${MAX_ACTIVE_CLAIMS} claims at a time. Pick one up or release it first.`);
    }

    // 3. The atomic step: only succeeds if the listing is still available and not expired
    const [won] = await tx
      .update(listings)
      .set({ status: "claimed" })
      .where(and(eq(listings.id, listingId), eq(listings.status, "available"), gt(listings.expiresAt, new Date())))
      .returning({ id: listings.id });
    if (!won) throw new ClaimError("Someone claimed this first, or it just expired.", "taken");

    // 4. Record the claim with a pickup code
    const [claim] = await tx
      .insert(claims)
      .values({ listingId, studentId, code: makeCode() })
      .returning({ id: claims.id });

    return claim.id;
  });
}

// Student says they collected the food
export async function pickUpFor(studentId: string, claimId: string) {
  return db.transaction(async (tx) => {
    const [claim] = await tx
      .update(claims)
      .set({ status: "picked_up", pickedUpAt: new Date() })
      .where(and(eq(claims.id, claimId), eq(claims.studentId, studentId), eq(claims.status, "active")))
      .returning({ listingId: claims.listingId });
    if (!claim) throw new ClaimError("This pickup is no longer active.");

    await tx.update(listings).set({ status: "picked_up" }).where(eq(listings.id, claim.listingId));
  });
}

// Student gives the food back so someone else can claim it
export async function releaseFor(studentId: string, claimId: string) {
  return db.transaction(async (tx) => {
    const [claim] = await tx
      .update(claims)
      .set({ status: "released" })
      .where(and(eq(claims.id, claimId), eq(claims.studentId, studentId), eq(claims.status, "active")))
      .returning({ listingId: claims.listingId });
    if (!claim) throw new ClaimError("This pickup is no longer active.");

    // Back in the feed. If it has already expired, the feed hides it anyway.
    await tx
      .update(listings)
      .set({ status: "available" })
      .where(and(eq(listings.id, claim.listingId), eq(listings.status, "claimed")));
  });
}

// Codes are forgiving: "lb-7k2qx", "7K2QX" and "LB-7K2QX" all match
export function normalizeCode(raw: string) {
  return "LB-" + raw.trim().toUpperCase().replace(/^LB-?/, "");
}

// Donor confirms a pickup by the code the student shows
export async function confirmByCodeFor(donorId: string, rawCode: string) {
  const code = normalizeCode(rawCode);
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        claimId: claims.id,
        status: claims.status,
        listingId: listings.id,
        title: listings.title,
        donorId: listings.donorId,
        studentName: users.name,
      })
      .from(claims)
      .innerJoin(listings, eq(listings.id, claims.listingId))
      .innerJoin(users, eq(users.id, claims.studentId))
      .where(eq(claims.code, code))
      .limit(1);

    // Same message whether the code doesn't exist or belongs to another donor
    if (!row || row.donorId !== donorId) {
      throw new ClaimError(`No pickup with code ${code} for your listings. Check the code and try again.`);
    }
    if (row.status !== "active") {
      throw new ClaimError(row.status === "picked_up" ? "That pickup was already confirmed." : "That pickup is no longer active.");
    }

    const [done] = await tx
      .update(claims)
      .set({ status: "picked_up", pickedUpAt: new Date() })
      .where(and(eq(claims.id, row.claimId), eq(claims.status, "active")))
      .returning({ id: claims.id });
    if (!done) throw new ClaimError("That pickup is no longer active.");

    await tx.update(listings).set({ status: "picked_up" }).where(eq(listings.id, row.listingId));
    return { title: row.title, studentName: row.studentName };
  });
}

// Donor marks a student who never came. Only allowed after the pickup window ends.
export async function noShowFor(donorId: string, claimId: string) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ status: claims.status, listingId: listings.id, donorId: listings.donorId, pickupEnd: listings.pickupEnd, expiresAt: listings.expiresAt })
      .from(claims)
      .innerJoin(listings, eq(listings.id, claims.listingId))
      .where(eq(claims.id, claimId))
      .limit(1);

    if (!row || row.donorId !== donorId) throw new ClaimError("That pickup doesn't exist.");
    if (row.status !== "active") throw new ClaimError("That pickup is no longer active.");
    if (row.pickupEnd.getTime() > Date.now()) throw new ClaimError("The pickup window is still open. The student may be on their way.");

    await tx.update(claims).set({ status: "no_show" }).where(and(eq(claims.id, claimId), eq(claims.status, "active")));

    // Give the food a second chance if it's still good
    const stillGood = row.expiresAt.getTime() > Date.now();
    await tx.update(listings).set({ status: stillGood ? "available" : "expired" }).where(eq(listings.id, row.listingId));
    return { relisted: stillGood };
  });
}
