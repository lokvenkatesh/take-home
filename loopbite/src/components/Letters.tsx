import type { CSSProperties } from "react";

// Splits text into one span per letter. Screen readers get the whole text from the parent's aria-label.
export function Letters({ text, rise = false }: { text: string; rise?: boolean }) {
  let i = 0;
  const words = text.split(" ");
  return (
    <span aria-hidden="true">
      {words.map((word, w) => (
        <span key={w}>
          <span className="word">
            {[...word].map((ch) => (
              <span key={i} className={`ch ${rise ? "rise-ch" : ""}`} style={{ "--i": i++ } as CSSProperties}>
                {ch}
              </span>
            ))}
          </span>
          {w < words.length - 1 ? " " : null}
        </span>
      ))}
    </span>
  );
}
