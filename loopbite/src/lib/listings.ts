import { z } from "zod";

export const CATEGORIES = [
  { value: "prepared", label: "Prepared meals" },
  { value: "bakery", label: "Bakery" },
  { value: "produce", label: "Fruit and vegetables" },
  { value: "dairy", label: "Dairy" },
] as const;

export const HANDLING = [
  { value: "room", label: "Room temp", detail: "Bread, fruit, packaged snacks" },
  { value: "cold", label: "Keep cold", detail: "Salads, sandwiches, dairy" },
  { value: "hot", label: "Keep hot", detail: "Must be picked up within 2 hours" },
] as const;

export const ALLERGENS = ["milk", "eggs", "wheat", "soy", "peanuts", "tree nuts", "fish", "shellfish", "sesame"] as const;
export const DIETARY = ["vegetarian", "vegan", "gluten-free", "halal"] as const;

export const PICKUP_WITHIN = [30, 60, 90, 120, 180, 240, 360];
export const GOOD_FOR = [60, 120, 180, 240, 360, 480, 720, 1440];

// 45 -> "45 minutes", 90 -> "1 hour 30 min", 120 -> "2 hours"
export function formatMinutes(min: number) {
  if (min < 60) return min === 1 ? "1 minute" : `${min} minutes`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  const hours = h === 1 ? "1 hour" : `${h} hours`;
  return m ? `${hours} ${m} min` : hours;
}

export const listingInput = z
  .object({
    title: z.string().trim().min(3, "Give the food a name of at least 3 characters").max(80),
    description: z.string().trim().max(400),
    category: z.enum(["bakery", "produce", "prepared", "dairy"], "Choose a category"),
    quantityText: z.string().trim().min(1, "Say how much there is, like 2 trays"),
    estLbs: z.coerce.number().int("Use a whole number of pounds")
      .min(1, "Weight must be at least 1 lb").max(500, "Weight can't be more than 500 lb"),
    handling: z.enum(["room", "cold", "hot"], "Choose how the food is stored"),
    allergens: z.array(z.enum(ALLERGENS)),
    dietary: z.array(z.enum(DIETARY)),
    location: z.string().trim().min(3, "Add where students should pick it up"),
    pickupWithin: z.coerce.number().int().min(15).max(720),
    goodFor: z.coerce.number().int().min(15).max(1440),
  })
  .refine((d) => d.pickupWithin <= d.goodFor, {
    message: "The pickup window has to end before the food expires",
    path: ["pickupWithin"],
  })
  .refine((d) => d.handling !== "hot" || d.pickupWithin <= 120, {
    message: "Hot food must be picked up within 2 hours. Shorten the window or choose Keep cold.",
    path: ["pickupWithin"],
  });

export type ListingStatus = "available" | "claimed" | "picked_up" | "expired" | "cancelled";

// Expiry is worked out when we read, so no background job is needed
export function effectiveStatus(status: ListingStatus, expiresAt: Date, now = Date.now()): ListingStatus {
  return status === "available" && expiresAt.getTime() <= now ? "expired" : status;
}

export const STATUS_LABEL: Record<ListingStatus, string> = {
  available: "Live",
  claimed: "Claimed",
  picked_up: "Picked up",
  expired: "Expired",
  cancelled: "Cancelled",
};
