"use client";

import { useActionState, useState } from "react";
import { dropClaim, markPickedUp } from "@/app/actions/claims";
import { btn, btnGhost } from "@/components/ui";

export function PassActions({ claimId }: { claimId: string }) {
  const [pickState, pickAction, picking] = useActionState(markPickedUp, undefined);
  const [dropState, dropAction, dropping] = useActionState(dropClaim, undefined);
  const [confirmDrop, setConfirmDrop] = useState(false);
  const error = pickState?.error ?? dropState?.error;
  const busy = picking || dropping;

  return (
    <div className="mt-6 space-y-3">
      {!confirmDrop ? (
        <div className="grid grid-cols-2 gap-3">
          <form action={pickAction}>
            <input type="hidden" name="claimId" value={claimId} />
            <button disabled={busy} className={`${btn} w-full`}>{picking ? "Saving…" : "I picked it up"}</button>
          </form>
          <button type="button" disabled={busy} onClick={() => setConfirmDrop(true)} className={`${btnGhost} w-full`}>
            Drop it
          </button>
        </div>
      ) : (
        <div className="reveal rounded-xl border-2 border-beet bg-beet/10 p-4">
          <p className="font-bold">Drop this pickup?</p>
          <p className="mt-1 text-sm">The food goes back to other students right away. You can&apos;t undo this.</p>
          <div className="mt-3 flex gap-3">
            <form action={dropAction}>
              <input type="hidden" name="claimId" value={claimId} />
              <button disabled={busy} className="inline-flex rounded-lg bg-beet px-4 py-2 font-bold text-white disabled:opacity-50">
                {dropping ? "Dropping…" : "Yes, drop it"}
              </button>
            </form>
            <button type="button" disabled={busy} onClick={() => setConfirmDrop(false)} className={btnGhost}>
              Keep it
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="rounded-lg bg-beet/10 px-3 py-2 text-sm font-bold text-beet">{error}</p>}
    </div>
  );
}
