"use client";

export const INSIGHT_EVENT = "loopbite:insight";

export function InsightButton({ listingId, title }: { listingId: string; title: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(INSIGHT_EVENT, { detail: listingId }))}
      className="ai-chip"
      aria-label={`AI details about ${title}`}
      title="AI details about this food"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9z" fill="currentColor" />
        <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" fill="currentColor" />
      </svg>
      <span>AI details</span>
    </button>
  );
}
