"use client";

import { useEffect, useRef } from "react";

// Bumps the number when it changes (for example, after a pickup)
export function TickerCount({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);

  useEffect(() => {
    const el = ref.current;
    if (el && prev.current !== value) {
      el.classList.remove("bump");
      void el.offsetWidth; // restart the animation
      el.classList.add("bump");
    }
    prev.current = value;
  }, [value]);

  return <span ref={ref} className="inline-block font-bold">{value}</span>;
}
