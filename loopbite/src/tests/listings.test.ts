import { test } from "node:test";
import assert from "node:assert/strict";
import { effectiveStatus, formatMinutes, listingInput } from "@/lib/listings";

const valid = {
  title: "Vegetable lasagna, 2 trays", description: "", category: "prepared", quantityText: "2 trays",
  estLbs: "16", handling: "hot", allergens: ["milk", "wheat"], dietary: ["vegetarian"],
  location: "Baker Hall, back entrance", pickupWithin: "90", goodFor: "120",
};

test("listing: a valid hot listing passes", () => {
  assert.equal(listingInput.safeParse(valid).success, true);
});

test("listing: hot food must be picked up within 2 hours", () => {
  const r = listingInput.safeParse({ ...valid, pickupWithin: "180", goodFor: "240" });
  assert.equal(r.success, false);
  assert.match(r.error!.issues[0].message, /2 hours/);
});

test("listing: the pickup window has to end before the food expires", () => {
  assert.equal(listingInput.safeParse({ ...valid, handling: "cold", pickupWithin: "360", goodFor: "60" }).success, false);
});

test("listing: weight must be at least 1 lb", () => {
  assert.equal(listingInput.safeParse({ ...valid, estLbs: "0" }).success, false);
});

test("status: available food past its expiry shows as expired; claimed food doesn't", () => {
  const past = new Date(Date.now() - 1000);
  assert.equal(effectiveStatus("available", past), "expired");
  assert.equal(effectiveStatus("claimed", past), "claimed");
});

test("formatMinutes reads naturally", () => {
  assert.equal(formatMinutes(1), "1 minute");
  assert.equal(formatMinutes(45), "45 minutes");
  assert.equal(formatMinutes(90), "1 hour 30 min");
  assert.equal(formatMinutes(120), "2 hours");
});
