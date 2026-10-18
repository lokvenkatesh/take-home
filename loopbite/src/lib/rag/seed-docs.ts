// Food-safety library seed: 13 public guidance documents (paraphrased) plus LoopBite's own policy.
// Admins can add, turn off or delete documents in the app. This file just gives a solid starting library.

export type SeedDoc = { slug: string; title: string; source: string; url: string | null; body: string };

export const SEED_DOCS: SeedDoc[] = [
  {
    slug: "usda-danger-zone",
    title: "The Danger Zone (40°F to 140°F) and the 2-hour rule",
    source: "USDA Food Safety and Inspection Service",
    url: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/danger-zone-40f-140f",
    body: `Bacteria grow fastest between 40°F and 140°F, a range USDA calls the Danger Zone. In that range, bacteria such as Salmonella, E. coli and Staphylococcus aureus can double in as little as 20 minutes.

Never leave perishable food out of refrigeration for more than 2 hours. If the air is hotter than 90°F, such as outdoors in summer, the limit is 1 hour. Throw away food left in the Danger Zone longer than that.

Keep hot food hot, at 140°F or above, in chafing dishes, warming trays, steam tables or slow cookers. Keep cold food cold, at 40°F or below, in the refrigerator, in a cooler, or in containers on ice.`,
  },
  {
    slug: "usda-leftovers",
    title: "Leftovers: cooling, storing and reheating",
    source: "USDA Food Safety and Inspection Service",
    url: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety",
    body: `Refrigerate leftovers within 2 hours of cooking, or within 2 hours of taking food out of a warmer or other appliance that kept it hot. Split large amounts into small, shallow containers so they cool quickly, then refrigerate at 40°F or below or freeze.

Most cooked leftovers can be kept in the refrigerator for 3 to 4 days. If you won't eat them in that time, freeze them right away. Bacteria that cause food poisoning usually don't change how food looks, smells or tastes, so when in doubt, throw it out.

Reheat leftovers until they reach 165°F, measured with a food thermometer, or until hot and steaming. Bring sauces, soups and gravies to a rolling boil. Cover food while reheating so it heats evenly, and stir or rotate it in a microwave.`,
  },
  {
    slug: "usda-freezing",
    title: "Freezing food: what stays safe and for how long",
    source: "USDA Food Safety and Inspection Service",
    url: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/freezing-and-food-safety",
    body: `Food kept constantly at 0°F or colder stays safe indefinitely. Freezing makes bacteria, yeasts and molds go dormant, so recommended freezer times are about quality, not safety. Taste and texture slowly decline the longer food is frozen.

Freeze food while it is fresh and wholesome. Freezing doesn't make spoiled food safe again. Cooked leftovers taste best if eaten within about 3 to 4 months of freezing.

Thaw frozen food safely in the refrigerator, in cold water, or in the microwave, never on the counter. Food thawed in the refrigerator can be refrozen without cooking, though it may lose some quality. Food thawed in cold water or the microwave should be cooked right away.`,
  },
  {
    slug: "usda-product-dating",
    title: "Best-by, sell-by and use-by dates",
    source: "USDA Food Safety and Inspection Service",
    url: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/food-product-dating",
    body: `Except for infant formula, dates on food are about quality, not safety, and federal law doesn't require them. A "Best if Used By" date tells you when food will have the best flavor or quality. A "Sell By" date helps stores manage stock.

If a date passes while the food is stored properly, it should still be safe and wholesome until signs of spoilage appear, such as an off smell, flavor or texture.

Infant formula is the exception. It must carry a "Use By" date and should not be used after that date.`,
  },
  {
    slug: "fda-hot-cold-holding",
    title: "Hot and cold holding temperatures for food service",
    source: "FDA Food Code 2022, sections 3-501.16 and 3-403.11",
    url: null,
    body: `In restaurants, dining halls and other food service, food that needs time and temperature control must be held hot at 135°F or above, or cold at 41°F or below. These are the temperatures health inspectors check. Consumer guidance from USDA uses slightly wider numbers, 140°F and 40°F.

Food in a warmer, steam table or chafing dish must stay at 135°F or hotter. Cold items such as dairy, cut fruit, cooked rice, salads and meat sandwiches must stay at 41°F or colder.

Cooked food that was cooled and is being reheated for hot holding must reach 165°F for 15 seconds, within 2 hours.`,
  },
  {
    slug: "fda-cooling",
    title: "Cooling cooked food quickly",
    source: "FDA Food Code 2022, section 3-501.14",
    url: null,
    body: `Cooked food must be cooled in two stages: from 135°F down to 70°F within 2 hours, then from 70°F down to 41°F within the next 4 hours, for a total of 6 hours or less.

Slow cooling is one of the most common causes of foodborne illness. Cooked rice, pasta, soups and stews left to cool on the counter can grow bacteria that reheating won't fix, so food that cooled too slowly should not be served or donated.

To cool food quickly, divide it into shallow pans or smaller portions, use an ice bath and stir, or use a blast chiller. Leave food uncovered and unstacked until it is cold.`,
  },
  {
    slug: "fda-time-control",
    title: "Time as a control instead of temperature (the 4-hour rule)",
    source: "FDA Food Code 2022, section 3-501.19",
    url: null,
    body: `Food service operations may hold food without temperature control for a limited time if they follow written procedures. Hot food must start at 135°F or above, and cold food at 41°F or below, when it leaves temperature control.

The food must be marked with the time it must be thrown away, and it must be eaten or discarded within 4 hours. Cold food that starts at 41°F or below and never goes above 70°F may be held for up to 6 hours.

Food held this way cannot be put back into hot or cold holding later. Once the time is up, it must be thrown out, not donated.`,
  },
  {
    slug: "fda-major-allergens",
    title: "The nine major food allergens",
    source: "FDA, Food Allergen Labeling and Consumer Protection Act (2004) and FASTER Act (2021)",
    url: "https://www.canr.msu.edu/news/the-faster-act-sesame-as-major-food-allergen",
    body: `The United States recognizes nine major food allergens: milk, eggs, fish, crustacean shellfish, tree nuts, peanuts, wheat, soybeans and sesame. Sesame became the ninth on January 1, 2023, under the FASTER Act.

These nine cause the vast majority of serious allergic reactions. Packaged foods must clearly name any of them that they contain.

For donated food without a label, list every major allergen it contains. If you're unsure whether something contains an allergen, list it rather than leave it off. Someone with a severe allergy should check with the café before eating.`,
  },
  {
    slug: "emerson-act",
    title: "Liability protection for food donors",
    source: "Bill Emerson Good Samaritan Food Donation Act (1996) and Food Donation Improvement Act (2022)",
    url: "https://www.congress.gov/117/bills/s5329/BILLS-117s5329es.htm",
    body: `The Bill Emerson Good Samaritan Food Donation Act protects people and businesses that donate apparently wholesome food in good faith from civil and criminal liability. Protection does not cover gross negligence or intentional misconduct.

The Food Donation Improvement Act of 2022 expanded this protection. "Qualified direct donors", which include restaurants, caterers, retail grocers, school food authorities and institutions of higher education, are now protected when they donate directly to people in need, not only through a nonprofit.

The 2022 update also protects donations offered at a "Good Samaritan reduced price", meaning a small charge that only covers the cost of handling and distributing the food.`,
  },
  {
    slug: "cdc-food-poisoning",
    title: "Food poisoning symptoms and when to see a doctor",
    source: "Centers for Disease Control and Prevention (CDC)",
    url: "https://www.cdc.gov/food-safety/signs-symptoms/index.html",
    body: `The most common symptoms of food poisoning are diarrhea, stomach pain or cramps, nausea, vomiting and fever. Symptoms depend on the germ and can start within hours or take days.

See a doctor if symptoms are severe: bloody diarrhea, diarrhea lasting more than 3 days, a fever over 102°F, vomiting so often you can't keep liquids down, or signs of dehydration such as peeing very little, a dry mouth and throat, or feeling dizzy when standing up.

If you have diarrhea or vomiting, drink plenty of fluids. Anyone who is pregnant and has a fever with flu-like symptoms should also see a doctor.`,
  },
  {
    slug: "fda-produce",
    title: "Washing fruits and vegetables",
    source: "U.S. Food and Drug Administration (FDA)",
    url: "https://www.fda.gov/consumers/consumer-updates/7-tips-cleaning-fruits-vegetables",
    body: `Wash your hands for 20 seconds with soap and warm water before and after handling fresh produce. Cut away bruised or damaged areas, and throw away produce that looks rotten.

Rinse fruits and vegetables under plain running water, rubbing gently. Don't use soap, detergent or produce washes. Rinse produce even if you plan to peel it, so dirt and bacteria aren't carried from the knife into the food. Scrub firm produce such as melons and cucumbers with a clean brush, then dry it with a clean cloth or paper towel.

Keep cut or peeled produce, such as sliced melon or bagged salad, refrigerated at 40°F or below.`,
  },
  {
    slug: "usda-refrigeration",
    title: "Refrigerator, freezer and cooler temperatures",
    source: "USDA Food Safety and Inspection Service",
    url: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/appliance-thermometers",
    body: `A refrigerator should stay at 40°F or below, and a freezer at 0°F or below. Bacteria grow very slowly below 40°F and multiply quickly between 40°F and 140°F. An appliance thermometer kept inside the refrigerator or freezer shows the real temperature.

When carrying perishable food, use a cooler with ice or cold packs. A full cooler stays cold longer than a half-empty one. Get perishable food into a refrigerator as soon as you can.

After a power outage, food is safe if the refrigerator is still at 40°F or below and the freezer at 0°F or below.`,
  },
  {
    slug: "food-recovery-served-food",
    title: "What food can be donated from a kitchen",
    source: "FDA Food Code 2022 and Conference for Food Protection, Comprehensive Guidance for Food Recovery Programs",
    url: "https://www.fda.gov/food/hfp-constituent-updates/new-fda-food-code-reduces-barriers-food-donations",
    body: `The 2022 FDA Food Code says food donations from restaurants and other food establishments are acceptable when the food has been stored, prepared, packaged and labeled following proper food safety practices.

Only unserved food should be donated. Food that has been served to a customer, or put out on a self-service buffet or salad bar where customers could touch it, should not be donated. Food that stayed in the kitchen at safe temperatures can be.

Food set aside for donation should be kept separate, labeled, and held at safe temperatures until it is picked up.`,
  },
  {
    slug: "loopbite-policy",
    title: "LoopBite's food rules",
    source: "LoopBite policy",
    url: null,
    body: `On LoopBite, hot food must be picked up within 2 hours of posting and carried in an insulated bag or carrier. If it has cooled down, the café should refrigerate it and relist it as Keep cold.

Cold food should travel in a cooler or insulated bag and reach a refrigerator within about an hour of pickup.

LoopBite does not accept home-cooked food, opened containers of dairy, food from a self-service buffet, or raw meat, chicken or seafood unless it is frozen solid. Each student can hold up to 2 claims at a time, and should drop a claim they can't pick up so someone else can have the food.`,
  },
];

// Retrieval test set: each question lists the documents that count as a correct hit in the top 3
export const EVAL_ANSWERABLE: [string, string[]][] = [
  ["How hot does food in the warmer need to stay?", ["fda-hot-cold-holding", "usda-danger-zone"]],
  ["How long can I keep leftovers in the fridge?", ["usda-leftovers"]],
  ["Can I freeze it and keep it for a few weeks?", ["usda-freezing"]],
  ["Is food past its best by date still safe?", ["usda-product-dating"]],
  ["Which allergens need to be listed?", ["fda-major-allergens"]],
  ["Could the café get sued if someone gets sick?", ["emerson-act"]],
  ["When should I see a doctor for food poisoning?", ["cdc-food-poisoning"]],
  ["Should I wash fruit with soap?", ["fda-produce"]],
  ["Can I donate pasta from the lunch buffet?", ["food-recovery-served-food", "loopbite-policy"]],
  ["How fast does cooked rice need to cool down?", ["fda-cooling"]],
  ["How long can food sit out at room temperature?", ["usda-danger-zone", "fda-time-control"]],
  ["What temperature should my fridge be?", ["usda-refrigeration"]],
  ["How do I reheat leftover soup?", ["usda-leftovers", "fda-hot-cold-holding"]],
  ["How long can hot food wait for pickup?", ["loopbite-policy", "usda-danger-zone"]],
];

export const EVAL_DECLINE: string[] = [
  "What is the best pizza in town?",
  "Who won the game last night?",
  "Do I need a business license to sell cookies?",
];
