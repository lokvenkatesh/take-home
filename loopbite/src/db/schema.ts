import { sql } from "drizzle-orm";
import {
  pgTable, pgEnum, uuid, text, integer, boolean, serial, timestamp, index, uniqueIndex,
} from "drizzle-orm/pg-core";

// Enums: Postgres rejects any value not in these lists
export const roleEnum = pgEnum("role", ["donor", "student", "admin"]);
export const categoryEnum = pgEnum("category", ["bakery", "produce", "prepared", "dairy"]);
export const handlingEnum = pgEnum("handling", ["room", "cold", "hot"]);
export const listingStatusEnum = pgEnum("listing_status", [
  "available", "claimed", "picked_up", "expired", "cancelled",
]);
export const claimStatusEnum = pgEnum("claim_status", [
  "active", "picked_up", "released", "no_show",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: roleEnum("role").notNull(),
  businessName: text("business_name"),
  blockedAt: timestamp("blocked_at", { withTimezone: true }),
  // Student preferences, used for ranking and safety filters
  prefCategories: text("pref_categories").array().notNull().default(sql`'{}'::text[]`),
  avoidAllergens: text("avoid_allergens").array().notNull().default(sql`'{}'::text[]`),
  dietNeeds: text("diet_needs").array().notNull().default(sql`'{}'::text[]`),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false), // admin access added to a student or café
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const listings = pgTable(
  "listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    donorId: uuid("donor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    category: categoryEnum("category").notNull(),
    quantityText: text("quantity_text").notNull(),
    estLbs: integer("est_lbs").notNull(),
    handling: handlingEnum("handling").notNull(),
    allergens: text("allergens").array().notNull().default(sql`'{}'::text[]`),
    dietary: text("dietary").array().notNull().default(sql`'{}'::text[]`),
    location: text("location").notNull(),
    pickupStart: timestamp("pickup_start", { withTimezone: true }).notNull(),
    pickupEnd: timestamp("pickup_end", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    status: listingStatusEnum("status").notNull().default("available"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("listings_feed_idx").on(t.status, t.expiresAt)],
);

export const claims = pgTable(
  "claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    code: text("code").notNull().unique(),
    status: claimStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    pickedUpAt: timestamp("picked_up_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("claims_one_live_per_listing")
      .on(t.listingId)
      .where(sql`${t.status} in ('active', 'picked_up')`),
  ],
);
export const reportStatusEnum = pgEnum("report_status", ["open", "resolved", "warned", "dismissed", "blocked"]);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: uuid("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    targetUserId: uuid("target_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id").references(() => listings.id, { onDelete: "set null" }),
    reason: text("reason").notNull(),
    details: text("details").notNull(),
    severity: text("severity").notNull(),
    status: reportStatusEnum("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [
    index("reports_status_idx").on(t.status, t.createdAt),
    index("reports_target_idx").on(t.targetUserId),
  ],
);

// Events, alerts and promotions from the admin, plus private warnings to one person
export const announcementKindEnum = pgEnum("announcement_kind", ["event", "alert", "promo", "warning"]);
export const audienceEnum = pgEnum("audience", ["all", "students", "donors", "user"]);

export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: announcementKindEnum("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    location: text("location"),
    link: text("link"),
    audience: audienceEnum("audience").notNull().default("all"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }), // only for audience "user"
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("announcements_window_idx").on(t.startsAt, t.endsAt)],
);

export const dismissals = pgTable(
  "dismissals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    announcementId: uuid("announcement_id").notNull().references(() => announcements.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("dismissals_user_announcement").on(t.userId, t.announcementId)],
);

// Every question asked, so admins can see what the safety library doesn't cover
export const safetyQuestions = pgTable(
  "safety_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    question: text("question").notNull(),
    topSource: text("top_source"),
    topScore: integer("top_score").notNull().default(0), // BM25 score x 100
    answered: boolean("answered").notNull(),
    mode: text("mode").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("safety_questions_created_idx").on(t.createdAt)],
);


// The food-safety library, managed by admins. Each document is split into chunks for retrieval.
export const safetyDocs = pgTable("safety_docs", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  source: text("source").notNull(),
  url: text("url"),
  body: text("body").notNull(),
  active: boolean("active").notNull().default(true),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const safetyChunks = pgTable(
  "safety_chunks",
  {
    id: serial("id").primaryKey(), // cited in answers as S<id>
    docId: uuid("doc_id").notNull().references(() => safetyDocs.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    text: text("text").notNull(),
  },
  (t) => [index("safety_chunks_doc_idx").on(t.docId)],
);
