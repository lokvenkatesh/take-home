"use client";

import { useEffect, useState } from "react";
import { TimeTag } from "./TimeTag";

// Starts from the server's time so the first render matches, then ticks in the browser
export function LiveTimeTag({ expiresAt, serverNow }: { expiresAt: string; serverNow: number }) {
  const end = new Date(expiresAt).getTime();
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  return <TimeTag minutes={(end - now) / 60_000} />;
}
