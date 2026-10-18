"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="tabs">
      {links.map((l) => {
        const active = path === l.href || path.startsWith(l.href + "/");
        // "/donor" shouldn't light up on "/donor/new"
        const exact = links.some((o) => o.href !== l.href && o.href.startsWith(l.href + "/") && path.startsWith(o.href));
        return (
          <Link key={l.href} href={l.href} aria-current={active && !exact ? "page" : undefined}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
