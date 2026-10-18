import type { ReactNode } from "react";
import { Brand } from "./Brand";
import { Letters } from "./Letters";

const HEADLINE = "Campus leftovers, before they're gone.";

export function Story({ animate = false }: { animate?: boolean }) {
  return (
    <div>
      <h1 aria-label={HEADLINE}>{animate ? <Letters text={HEADLINE} rise /> : HEADLINE}</h1>
      <p className="lead">
        Free food on campus usually goes to whoever hears about it first. LoopBite tells every student
        the moment it&apos;s posted, and holds it for whoever claims it.
      </p>
      <ol className={`route ${animate ? "animate" : ""}`}>
        <li><div><b>A dining hall posts what&apos;s left</b><p className="text-sm text-ink-2">Trays, pastries, fruit. Posting takes under a minute.</p></div></li>
        <li><div><b>Every student nearby sees it at once</b><p className="text-sm text-ink-2">Each listing shows how long it has before it&apos;s gone.</p></div></li>
        <li><div><b>Claim it and it&apos;s held for you</b><p className="text-sm text-ink-2">Show your pickup code at the counter.</p></div></li>
      </ol>
    </div>
  );
}

export function TopBar() {
  return (
    <header className="top">
      <div className="top-in">
        <Brand />
      </div>
    </header>
  );
}

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <TopBar />
      <div className="gate">
        <Story />
        <div className="authcard">
          <h2 className="text-2xl font-bold">{title}</h2>
          {children}
        </div>
      </div>
    </>
  );
}
