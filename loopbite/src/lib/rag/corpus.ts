// LoopBite's food-safety library. Paraphrased guidance plus LoopBite's own policies.
// Each chunk is short and about one topic, which keeps retrieval precise and citations meaningful.

export type SafetyDoc = { id: string; title: string; source: string; text: string };

export const SAFETY_DOCS: SafetyDoc[] = [
  { id: "S1", source: "FDA Food Code 3-501.16", title: "Hot holding temperature",
    text: "Hot food that needs temperature control, such as food in a warmer or chafing dish, must stay at 135°F (57°C) or above. Food that drops below 135°F has to be reheated, used under a time limit, or thrown out." },
  { id: "S2", source: "FDA Food Code 3-501.16", title: "Cold holding temperature",
    text: "Cold food that needs temperature control must be held at 41°F (5°C) or below, in a refrigerator, walk-in or cooler. Milk, yogurt, cheese, cut fruit, cooked rice, salads and sandwiches with meat all count as food that needs temperature control." },
  { id: "S3", source: "FDA Food Code 3-501.19", title: "Time as a control instead of temperature",
    text: "Food can be kept out of temperature control for up to 4 hours if it is marked with the time it left temperature control. After 4 hours it must be thrown out, not donated. Food held this way cannot go back into hot or cold holding." },
  { id: "S4", source: "FDA Food Code 3-501.14", title: "Cooling cooked food",
    text: "Cooked food must cool from 135°F to 70°F within 2 hours, and to 41°F within 6 hours total. Shallow pans and ice baths help. Cooked rice, pasta and soups that cooled slowly on the counter should not be donated." },
  { id: "S5", source: "FDA Food Code 3-403.11", title: "Reheating for hot holding",
    text: "Cooked food that was cooled and is reheated for hot holding must reach 165°F within 2 hours. Receivers should reheat donated prepared meals until steaming hot before serving." },
  { id: "S6", source: "FDA Food Code 3-306.14", title: "Food already served or on a buffet",
    text: "Food that has been served to a customer, or left out on a self-service buffet or salad bar during lunch or dinner service, where customers could touch it, such as buffet pasta, salads or rice, cannot be re-served or donated. Food kept in the kitchen and never put out for customers can be donated if it was held at safe temperatures." },
  { id: "S7", source: "FASTER Act and FDA allergen labeling", title: "Major food allergens",
    text: "The US recognizes nine major food allergens: milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soy and sesame. Donated food should list any of these it contains. When unsure, list the allergen rather than leave it off." },
  { id: "S8", source: "Bill Emerson Good Samaritan Food Donation Act and 2022 Food Donation Improvement Act", title: "Donor liability protection",
    text: "Donors and nonprofits that donate apparently wholesome food in good faith are protected from civil and criminal liability if someone gets sick, except for gross negligence or intentional misconduct. Since 2022 the protection also covers donating directly to people in need and charging receivers a small fee to cover costs." },
  { id: "S9", source: "USDA FSIS guidance on date labels", title: "Best-by and sell-by dates",
    text: "Best-by, sell-by and use-by dates on most foods describe quality, not safety. Shelf-stable food past its best-by date can usually still be donated if the package is intact. Infant formula is the exception and must not be donated after its use-by date." },
  { id: "S10", source: "LoopBite policy: hot food", title: "Hot food pickup window",
    text: "On LoopBite, hot food must be picked up within 2 hours of posting and carried in an insulated bag or carrier. Drivers check that food is still steaming at pickup. If it has cooled, the donor should chill it and relist it as Keep cold." },
  { id: "S11", source: "LoopBite policy: what we accept", title: "Food LoopBite does not accept",
    text: "LoopBite does not accept home-cooked food, opened containers of dairy, raw meat, chicken or seafood unless it is frozen solid, alcohol, or food from a self-service buffet. Dented cans are fine unless they are bulging or leaking." },
  { id: "S12", source: "LoopBite policy: transport", title: "Transporting cold and frozen food",
    text: "Cold food must travel in a cooler with ice packs and reach the receiver within 60 minutes of pickup. Frozen food should stay frozen solid. If a receiver does not have refrigeration, pick shelf-stable or hot food instead." },
];

// Test questions with the source that must come back in the top 3, plus questions it should decline
export const EVAL_ANSWERABLE: [string, string][] = [
  ["How hot does food in the warmer need to stay?", "S1"],
  ["What temperature should yogurt be kept at?", "S2"],
  ["Can I donate pasta from the lunch buffet?", "S6"],
  ["Could I get sued if someone gets sick?", "S8"],
  ["Can I donate crackers past the best by date?", "S9"],
  ["Rice cooled on the counter overnight, can I donate it?", "S4"],
  ["Which allergens do I need to list?", "S7"],
  ["How long can hot soup wait for pickup?", "S10"],
  ["Can I donate frozen chicken?", "S11"],
  ["Is it ok to give cooked rice from yesterday?", "S4"],
];
export const EVAL_DECLINE: string[] = [
  "What is the best pizza in town?",
  "Who won the game?",
  "Do I need a license to donate?",
];
