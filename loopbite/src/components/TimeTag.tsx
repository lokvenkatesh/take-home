// Fresh (3h+), soon (under 3h), almost gone (under 1h)
export function TimeTag({ minutes }: { minutes: number }) {
  if (minutes <= 0) return <span className="badge neutral">Gone</span>;

  const tone = minutes < 60 ? "crit" : minutes < 180 ? "warn" : "fresh";
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  const text = h ? `${h}h ${m}m left` : `${m} min left`;

  return <span className={`badge ${tone}`}><i />{text}</span>;
}
