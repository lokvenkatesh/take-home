// Plain values only, safe to import from browser (client) components. No database here.

export const KIND_LABEL = { event: "Event", alert: "Alert", promo: "Promotion", warning: "Warning" } as const;
export const AUDIENCE_LABEL = { all: "Everyone", students: "Students", donors: "Cafés and dining halls", user: "One person" } as const;

export const STARTS_IN = [
  { value: 0, label: "Now" },
  { value: 60, label: "In 1 hour" },
  { value: 180, label: "In 3 hours" },
  { value: 1440, label: "Tomorrow" },
  { value: 2880, label: "In 2 days" },
  { value: 10080, label: "In a week" },
];

export const RUNS_FOR = [
  { value: 60, label: "1 hour" },
  { value: 180, label: "3 hours" },
  { value: 360, label: "6 hours" },
  { value: 1440, label: "1 day" },
  { value: 4320, label: "3 days" },
  { value: 10080, label: "1 week" },
  { value: 20160, label: "2 weeks" },
];

// "45 min", "3 hr", "2 days"
export function duration(ms: number) {
  const m = Math.round(Math.abs(ms) / 60_000);
  if (m < 60) return `${Math.max(1, m)} min`;
  if (m < 1440) return `${Math.round(m / 60)} hr`;
  const d = Math.round(m / 1440);
  return d === 1 ? "1 day" : `${d} days`;
}
