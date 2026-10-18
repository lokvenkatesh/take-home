import { announcementsFor, duration, KIND_LABEL } from "@/lib/announcements";
import { dismissAnnouncement } from "@/app/actions/announcements";
import type { Role } from "@/lib/session";

export async function Announcements({ userId, role }: { userId: string; role: Role }) {
  const items = await announcementsFor(userId, role);
  const now = Date.now();

  const banners = items.filter((a) => (a.kind === "alert" || a.kind === "warning") && a.startsAt.getTime() <= now);
  const cards = items.filter((a) => a.kind === "event" || a.kind === "promo");
  if (banners.length === 0 && cards.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {banners.map((a) => (
        <div
          key={a.id}
          role={a.kind === "warning" ? "alert" : "status"}
          className={`reveal flex items-start justify-between gap-4 rounded-2xl border p-4 ${
            a.kind === "warning" ? "border-crit bg-crit-soft" : "border-gold bg-gold-soft"
          }`}
        >
          <div>
            <p className="font-bold">
              <span className={`badge mr-2 ${a.kind === "warning" ? "crit" : "lock"}`}>{KIND_LABEL[a.kind]}</span>
              {a.title}
            </p>
            {a.body && <p className="mt-1 text-sm">{a.body}</p>}
          </div>
          <form action={dismissAnnouncement}>
            <input type="hidden" name="id" value={a.id} />
            <button className="link shrink-0">{a.kind === "warning" ? "Got it" : "Dismiss"}</button>
          </form>
        </div>
      ))}

      {cards.length > 0 && (
        <section aria-label="Happening on campus">
          <h2 className="mb-2 text-lg font-bold">Happening on campus</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((a) => {
              const started = a.startsAt.getTime() <= now;
              return (
                <li key={a.id} className="listing !block p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`badge ${a.kind === "event" ? "lock" : "neutral"}`}>{KIND_LABEL[a.kind]}</span>
                    <form action={dismissAnnouncement}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="link text-xs" aria-label={`Dismiss ${a.title}`}>Dismiss</button>
                    </form>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold">{a.title}</h3>
                  {a.body && <p className="mt-1 text-sm text-ink-2">{a.body}</p>}
                  <p className="mt-2 text-sm font-semibold">
                    {started ? `On now, ends in ${duration(a.endsAt.getTime() - now)}` : `Starts in ${duration(a.startsAt.getTime() - now)}`}
                    {a.location ? `, ${a.location}` : ""}
                  </p>
                  {a.link && (
                    <a href={a.link} target="_blank" rel="noopener noreferrer" className="link mt-1 inline-block">Learn more</a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
