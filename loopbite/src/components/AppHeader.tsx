import Link from "next/link";
import { and, eq, gte, sum } from "drizzle-orm";
import { db } from "@/db";
import { claims, listings } from "@/db/schema";
import { logout } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { Brand } from "./Brand";
import { NavLinks } from "./NavLinks";
import { AssistantDrawer } from "./AssistantDrawer";
import { TickerCount } from "./TickerCount";

const LINKS = {
  student: [
    { href: "/feed", label: "Browse food" },
    { href: "/claims", label: "My claims" },
    { href: "/preferences", label: "Preferences" },
    { href: "/safety", label: "Food safety" },
  ],
  donor: [
    { href: "/donor", label: "Your listings" },
    { href: "/donor/new", label: "Post food" },
    { href: "/safety", label: "Food safety" },
  ],
  admin: [
    { href: "/admin", label: "Trust and safety" },
    { href: "/admin/users", label: "Accounts" },
    { href: "/admin/announcements", label: "Events and alerts" },
  ],
};

export async function AppHeader({
  name,
  role,
  hideAssistant = false,
}: {
  name: string;
  role: keyof typeof LINKS;
  businessName?: string | null;
  hideAssistant?: boolean;
}) {
  const me = await getCurrentUser();

  // Real numbers: pounds of food picked up in the last 7 days
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [{ lbs }] = await db
    .select({ lbs: sum(listings.estLbs) })
    .from(claims)
    .innerJoin(listings, eq(listings.id, claims.listingId))
    .where(and(eq(claims.status, "picked_up"), gte(claims.pickedUpAt, since)));
  const rescued = Number(lbs ?? 0);

  const initials = name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <>
    <header className="top">
      <div className="top-in">
        <Brand />
        <div className="ticker"><span className="live-dot" /><span><TickerCount value={rescued} />{" "}lbs of food rescued this week</span></div>
        <div className="who">
          <span className="avatar" aria-hidden="true">{initials}</span>
          <Link href="/account" className="hidden hover:underline sm:inline">{name}</Link>
          <form action={logout}><button className="link">Sign out</button></form>
        </div>
      </div>
      <NavLinks links={me?.isAdmin && role !== "admin" ? [...LINKS[role], ...LINKS.admin] : LINKS[role]} />
      {me?.blockedAt && (
        <div className="border-t border-crit bg-crit-soft px-5 py-3 text-center text-sm font-semibold">
          Your account is blocked after reports from other users, so you can&apos;t {role === "donor" ? "post" : "claim"} food right now. Email trust@loopbite.app to appeal.
        </div>
      )}
    </header>
    {!hideAssistant && <AssistantDrawer role={role} />}
    </>
  );
}
