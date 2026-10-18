import { test } from "node:test";
import assert from "node:assert/strict";
import { normalize, parseWithRules } from "@/lib/ai/parse-listing";

test("parser: hot pasta in a warmer is prepared, hot, with milk and wheat", () => {
  const d = normalize(parseWithRules("3 trays of chicken alfredo from lunch, still in the warmer"));
  assert.equal(d.category, "prepared");
  assert.equal(d.handling, "hot");
  assert.deepEqual(d.allergens, ["milk", "wheat"]);
  assert.equal(d.quantityText, "3 trays");
  assert.ok(d.pickupWithin <= 120, "hot food gets at most a 2-hour window");
});

test("parser: flags buffet food as a safety concern", () => {
  const d = normalize(parseWithRules("Pasta salad from the lunch buffet"));
  assert.equal(d.safetyNotes.length, 1);
  assert.match(d.safetyNotes[0], /buffet/i);
});

test("cleanup: whatever the model returns is clamped to the form's rules", () => {
  const d = normalize({ estLbs: 9999, allergens: ["milk", "gluten"], handling: "hot", goodForMinutes: 100, category: "pizza" });
  assert.equal(d.estLbs, 500);                 // clamped to the maximum
  assert.deepEqual(d.allergens, ["milk"]);     // unknown allergen dropped
  assert.equal(d.category, "prepared");        // unknown category falls back
  assert.equal(d.goodFor, 120);                // snapped to the nearest option
  assert.ok(d.pickupWithin <= 120);
});

test("cleanup: garbage input doesn't crash", () => {
  const d = normalize("not an object");
  assert.equal(d.category, "prepared");
  assert.equal(d.estLbs, null);
});
