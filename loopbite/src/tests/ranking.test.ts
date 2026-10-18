import { test } from "node:test";
import assert from "node:assert/strict";
import { checkSafety, scoreListing, type Prefs } from "@/lib/ranking";

const none: Prefs = { categories: [], avoid: [], diet: [] };
const now = Date.now();
const inMins = (m: number) => new Date(now + m * 60_000);

test("safety: hides allergens the student avoids and food missing their diet", () => {
  const r = checkSafety({ allergens: ["milk", "tree nuts"], dietary: [] }, { categories: [], avoid: ["tree nuts"], diet: ["vegetarian"] });
  assert.equal(r.ok, false);
  assert.deepEqual(r.blocked, ["tree nuts"]);
  assert.deepEqual(r.missing, ["vegetarian"]);
});

test("safety: passes when nothing conflicts", () => {
  assert.equal(checkSafety({ allergens: ["milk"], dietary: ["vegetarian"] }, { categories: [], avoid: ["peanuts"], diet: ["vegetarian"] }).ok, true);
});

test("score: food about to expire ranks above food with hours left", () => {
  const soon = scoreListing({ category: "bakery", estLbs: 5, expiresAt: inMins(30) }, none, {}, now);
  const later = scoreListing({ category: "bakery", estLbs: 5, expiresAt: inMins(360) }, none, {}, now);
  assert.ok(soon.score > later.score);
});

test("score: a category the student picked ranks higher", () => {
  const prefs: Prefs = { categories: ["bakery"], avoid: [], diet: [] };
  const picked = scoreListing({ category: "bakery", estLbs: 5, expiresAt: inMins(120) }, prefs, {}, now);
  const other = scoreListing({ category: "prepared", estLbs: 5, expiresAt: inMins(120) }, prefs, {}, now);
  assert.ok(picked.score > other.score);
});

test("score: learns from pickup history", () => {
  const history = { prepared: 3 };
  const usual = scoreListing({ category: "prepared", estLbs: 5, expiresAt: inMins(120) }, none, history, now);
  const unusual = scoreListing({ category: "bakery", estLbs: 5, expiresAt: inMins(120) }, none, history, now);
  assert.ok(usual.score > unusual.score);
});

test("score: the breakdown adds up to the total and stays within 0-100", () => {
  const r = scoreListing({ category: "produce", estLbs: 30, expiresAt: inMins(10) }, { categories: ["produce"], avoid: [], diet: [] }, { produce: 2 }, now);
  assert.equal(r.parts.reduce((s, p) => s + p.points, 0), r.score);
  assert.ok(r.score >= 0 && r.score <= 100);
});
