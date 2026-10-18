import bcrypt from "bcryptjs";
import { inArray, isNull } from "drizzle-orm";
import { db } from "./index";
import { users, listings, claims, reports, announcements, dismissals } from "./schema";

const mins = (n: number) => new Date(Date.now() + n * 60_000);

async function main() {
  // Delete in this order: claims point to listings, listings point to users
  // Only reset the demo accounts. Accounts people created, and everything they did, stay.
  const DEMO_EMAILS = ["admin@loopbite.app", "donor@loopbite.app", "cafe@loopbite.app", "student@loopbite.app", "ravi@loopbite.app"];
  // Deleting a user cascades to their listings, claims, reports and dismissals
  await db.delete(users).where(inArray(users.email, DEMO_EMAILS));
  // Sample posts have no creator. Posts made by real admins are kept.
  await db.delete(announcements).where(isNull(announcements.createdBy));

  const pw = await bcrypt.hash("loopbite", 10);
  const adminPw = await bcrypt.hash("admin-demo", 10);

  const seededUsers = await db
    .insert(users)
    .values([
      { email: "admin@loopbite.app", passwordHash: adminPw, name: "Priya Shah", role: "admin" },
      { email: "donor@loopbite.app", passwordHash: pw, name: "Sam Rivera", role: "donor", businessName: "Baker Hall Dining" },
      { email: "cafe@loopbite.app", passwordHash: pw, name: "Lena Ortiz", role: "donor", businessName: "Bean & Leaf Café" },
      { email: "student@loopbite.app", passwordHash: pw, name: "Maya Chen", role: "student" },
      { email: "ravi@loopbite.app", passwordHash: pw, name: "Ravi Patel", role: "student" },
    ])
    .returning();

  const [, hall, cafe, maya, ravi] = seededUsers;

  const seededListings = await db
    .insert(listings)
    .values([
      {
        donorId: hall.id, title: "Vegetable lasagna, 2 trays", category: "prepared",
        quantityText: "2 trays", estLbs: 16, handling: "hot",
        allergens: ["milk", "wheat"], dietary: ["vegetarian"],
        location: "Baker Hall, back entrance",
        pickupStart: mins(0), pickupEnd: mins(90), expiresAt: mins(100),
      },
      {
        donorId: hall.id, title: "Chicken and rice bowls", category: "prepared",
        quantityText: "20 bowls", estLbs: 15, handling: "cold",
        allergens: [], dietary: [],
        location: "Baker Hall, back entrance",
        pickupStart: mins(0), pickupEnd: mins(170), expiresAt: mins(180),
      },
      {
        donorId: hall.id, title: "Fruit cups", category: "produce",
        quantityText: "30 cups", estLbs: 9, handling: "cold",
        allergens: [], dietary: ["vegan", "gluten-free"],
        location: "Baker Hall, front desk",
        pickupStart: mins(0), pickupEnd: mins(350), expiresAt: mins(360),
      },
      {
        donorId: cafe.id, title: "Day-old croissants and muffins", category: "bakery",
        quantityText: "3 dozen", estLbs: 6, handling: "room",
        allergens: ["milk", "eggs", "wheat"], dietary: ["vegetarian"],
        location: "Bean & Leaf Café counter",
        pickupStart: mins(0), pickupEnd: mins(40), expiresAt: mins(45),
      },
      {
        donorId: cafe.id, title: "Yogurt parfaits", category: "dairy",
        quantityText: "12 cups", estLbs: 5, handling: "cold",
        allergens: ["milk", "nuts"], dietary: ["vegetarian"],
        location: "Bean & Leaf Café counter",
        pickupStart: mins(0), pickupEnd: mins(230), expiresAt: mins(240),
      },
      {
        donorId: cafe.id, title: "Turkey sandwiches", category: "prepared",
        quantityText: "10 sandwiches", estLbs: 5, handling: "cold",
        allergens: ["wheat"], dietary: [],
        location: "Bean & Leaf Café counter",
        pickupStart: mins(0), pickupEnd: mins(110), expiresAt: mins(120),
        status: "claimed",
      },
    ])
    .returning();

  // The sandwiches are already claimed, so they need a matching claim row
  await db.insert(claims).values({
    listingId: seededListings[5].id,
    studentId: maya.id,
    code: "LB-7K2Q",
  });

  const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);
  const L = seededListings;
  await db.insert(reports).values([
    { reporterId: maya.id, targetUserId: hall.id, listingId: L[0].id, reason: "temp", details: "The lasagna was lukewarm when I picked it up, not hot.", severity: "medium", createdAt: daysAgo(0.2) },
    { reporterId: ravi.id, targetUserId: hall.id, listingId: L[1].id, reason: "unsafe", details: "The rice smelled off, so I threw it out.", severity: "high", createdAt: daysAgo(1.3) },
    { reporterId: maya.id, targetUserId: hall.id, listingId: L[2].id, reason: "temp", details: "The fruit cups were warm, not cold.", severity: "medium", createdAt: daysAgo(2.4) },
    { reporterId: ravi.id, targetUserId: cafe.id, listingId: L[4].id, reason: "allergen", details: "The parfait had peanuts on top, but peanuts weren't listed.", severity: "high", createdAt: daysAgo(1.1) },
    { reporterId: maya.id, targetUserId: cafe.id, listingId: L[3].id, reason: "mismatch", details: "The listing said 3 dozen, there were about 10 pastries.", severity: "low", status: "warned", createdAt: daysAgo(3.5), resolvedAt: daysAgo(3.3) },
    { reporterId: hall.id, targetUserId: ravi.id, listingId: L[1].id, reason: "noshow", details: "Claimed the bowls and never came.", severity: "low", createdAt: daysAgo(0.6) },
    { reporterId: cafe.id, targetUserId: ravi.id, listingId: L[5].id, reason: "noshow", details: "Missed the pickup window with no message.", severity: "low", status: "dismissed", createdAt: daysAgo(5.2), resolvedAt: daysAgo(4.9) },
    { reporterId: ravi.id, targetUserId: cafe.id, listingId: L[3].id, reason: "handoff", details: "Nobody at the counter knew about the pickup.", severity: "low", status: "resolved", createdAt: daysAgo(6.1), resolvedAt: daysAgo(5.8) },
  ]);

  const hoursFromNow = (h: number) => new Date(Date.now() + h * 60 * 60 * 1000);
  await db.insert(announcements).values([
    { kind: "event", title: "Free pizza night", body: "Leftover pizza from the club fair. First come, first served.", location: "Student Union, room 210", audience: "students", startsAt: hoursFromNow(3), endsAt: hoursFromNow(6) },
    { kind: "promo", title: "Bean & Leaf: extra pastries every Friday", body: "They post their leftover pastries every Friday after 4 PM.", location: "Bean & Leaf Café", audience: "students", startsAt: hoursFromNow(-1), endsAt: hoursFromNow(24 * 7) },
    { kind: "alert", title: "Baker Hall pickups use the side door today", body: "The back entrance is closed for repairs until 6 PM.", audience: "all", startsAt: hoursFromNow(-1), endsAt: hoursFromNow(8) },
    { kind: "alert", title: "Hot food reminder", body: "Keep hot food at 135°F or above until pickup, and post it within 2 hours.", audience: "donors", startsAt: hoursFromNow(-1), endsAt: hoursFromNow(48) },
  ]);

  console.log(
    `Seeded ${seededUsers.length} users, ${seededListings.length} listings, 1 claim.`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});