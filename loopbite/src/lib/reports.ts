export type Severity = "high" | "medium" | "low";
export type ReportKind = "food" | "student";

// Reasons a student can give about a listing (and its donor)
export const FOOD_REASONS = [
  { value: "unsafe", label: "Food was spoiled or unsafe", severity: "high" },
  { value: "allergen", label: "Allergens were missing or wrong", severity: "high" },
  { value: "temp", label: "Wrong temperature (hot food cold, cold food warm)", severity: "medium" },
  { value: "mismatch", label: "Not what the listing said", severity: "low" },
  { value: "handoff", label: "Pickup problem or rude staff", severity: "low" },
  { value: "other", label: "Something else", severity: "low" },
] as const;

// Reasons a donor can give about the student who claimed their food
export const STUDENT_REASONS = [
  { value: "noshow", label: "Didn't show up for pickup", severity: "low" },
  { value: "resale", label: "Reselling or misusing food", severity: "medium" },
  { value: "conduct", label: "Rude or unsafe behavior", severity: "medium" },
  { value: "other", label: "Something else", severity: "low" },
] as const;

export function reasonsFor(kind: ReportKind) {
  return kind === "food" ? FOOD_REASONS : STUDENT_REASONS;
}

export function reasonLabel(value: string) {
  return [...FOOD_REASONS, ...STUDENT_REASONS].find((r) => r.value === value)?.label ?? value;
}

export const REPORT_STATUS_LABEL = {
  open: "Open",
  resolved: "Resolved",
  warned: "Warning sent",
  dismissed: "Dismissed",
  blocked: "Account blocked",
} as const;
