const ICONS = {
  bakery: (
    <>
      <path d="M6 30c0-9 8-15 18-15s18 6 18 15c0 3-2 5-5 5H11c-3 0-5-2-5-5z" fill="currentColor" />
      <path d="M16 22l3 7M24 20l2 8M32 22l-1 7" stroke="var(--tile-bg)" strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  produce: (
    <>
      <path d="M9 39C9 21 21 10 40 8c0 19-11 31-29 33" fill="currentColor" />
      <path d="M12 37L31 18" stroke="var(--tile-bg)" strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  prepared: (
    <>
      <path d="M6 26h36c0 10-8 15-18 15S6 36 6 26z" fill="currentColor" />
      <path d="M16 20c-2-3 2-4 0-8M24 20c-2-3 2-4 0-8M32 20c-2-3 2-4 0-8" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </>
  ),
  dairy: (
    <>
      <path d="M14 19l6-9h12l2 9v21H14z" fill="currentColor" />
      <path d="M14 19h20M20 26h8" stroke="var(--tile-bg)" strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
};

export function CategoryTile({ category }: { category: keyof typeof ICONS }) {
  return (
    <div className={`tile ${category}`}>
      <svg viewBox="0 0 48 48" aria-hidden="true">{ICONS[category]}</svg>
    </div>
  );
}
