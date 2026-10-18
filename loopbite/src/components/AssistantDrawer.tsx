"use client";

import { useEffect, useState } from "react";
import { ASK_EVENT, AssistantChat } from "./AssistantChat";
import { Logo } from "./Logo";

const SUGGESTIONS: Record<string, string[]> = {
  student: [
    "How long can I keep picked-up food before eating it?",
    "Should I reheat a donated hot meal?",
    "Is food past its best-by date safe?",
  ],
  donor: [
    "Can I donate pasta from the lunch buffet?",
    "How long can hot soup wait for pickup?",
    "Could I get sued if someone gets sick?",
  ],
  admin: [
    "Which allergens do donors need to list?",
    "What food does LoopBite not accept?",
    "How cold does dairy need to be kept?",
  ],
};

export function AssistantDrawer({ role }: { role: "student" | "donor" | "admin" }) {
  const [open, setOpen] = useState(false);

  // Open when another part of the app sends a question
  useEffect(() => {
    const onAsk = () => setOpen(true);
    window.addEventListener(ASK_EVENT, onAsk);
    return () => window.removeEventListener(ASK_EVENT, onAsk);
  }, []);

  // Escape closes it
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} className="assist-fab" aria-controls="assistant" aria-expanded={false}>
          <span className="assist-fab-logo" aria-hidden="true"><Logo /></span>
          Ask LoopBite
        </button>
      )}
      {open && <div className="assist-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}

      {/* Stays mounted while closed, so the conversation is kept */}
      <aside id="assistant" role="dialog" aria-label="LoopBite assistant" inert={!open} className={`assist-drawer ${open ? "open" : ""}`}>
        <div className="flex items-start justify-between gap-3 border-b border-line p-4">
          <div>
            <p className="font-display text-lg font-bold">LoopBite assistant</p>
            <p className="text-sm text-ink-2">Food-safety answers, with sources you can check.</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="link" aria-label="Close assistant">Close</button>
        </div>
        <AssistantChat suggestions={SUGGESTIONS[role]} intro="Try one of these, or ask your own:" listen autoFocus={open} />
      </aside>
    </>
  );
}
