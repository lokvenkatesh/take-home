// Ranking for the student feed: hard safety filters first, then a transparent 0-100 score

export type Prefs = { categories: string[]; avoid: string[]; diet: string[] };
export type ScorePart = { label: string; points: number; max: number; detail: string };

const clamp = (n: number) => Math.max(0, Math.min(1, n));

// Safety is a filter, never a trade-off
export function checkSafety(l: { allergens: string[]; dietary: string[] }, prefs: Prefs) {
  const blocked = l.allergens.filter((a) => prefs.avoid.includes(a));
  const missing = prefs.diet.filter((d) => !l.dietary.includes(d));
  return { ok: blocked.length === 0 && missing.length === 0, blocked, missing };
}

export function scoreListing(
  l: { category: string; estLbs: number; expiresAt: Date },
  prefs: Prefs,
  history: Record<string, number>, // pickups per category
  now: number,
) {
  const mins = Math.max(0, (l.expiresAt.getTime() - now) / 60_000);

  // 1. Time left: sooner to expire = more urgent to rescue (full points at 0, none at 6h+)
  const urgency = clamp(1 - mins / 360);

  // 2. Tastes: what they said they like, blended with what they actually pick up
  const picked = prefs.categories.includes(l.category);
  const stated = prefs.categories.length ? (picked ? 1 : 0.2) : 0.5;
  const maxPast = Math.max(0, ...Object.values(history));
  const past = maxPast ? (history[l.category] ?? 0) / maxPast : null;
  const taste = past === null ? stated : 0.6 * stated + 0.4 * past;

  // 3. Amount: log scale, so 30 lb is better than 1 lb but not 30 times better
  const size = clamp(Math.log1p(l.estLbs) / Math.log1p(30));

  const parts: ScorePart[] = [
    {
      label: "Time left",
      points: Math.round(35 * urgency),
      max: 35,
      detail: mins < 60 ? "Almost gone, rescue it first" : mins < 180 ? "Going in the next few hours" : "Plenty of time",
    },
    {
      label: "Your tastes",
      points: Math.round(40 * taste),
      max: 40,
      detail: picked
        ? past ? "A category you picked, and you've collected it before" : "A category you picked"
        : past ? "You've collected food like this before" : prefs.categories.length ? "Not one of your picks" : "Set preferences to personalize this",
    },
    { label: "Amount", points: Math.round(25 * size), max: 25, detail: `About ${l.estLbs} lb` },
  ];

  return { score: parts.reduce((sum, p) => sum + p.points, 0), parts };
}
