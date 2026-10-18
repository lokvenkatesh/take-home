"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { confirmPickup, markNoShow, type PickupState } from "@/app/actions/pickups";
import { btn, btnGhost, input } from "@/components/ui";

function useRefreshOnSuccess(state: PickupState) {
  const router = useRouter();
  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state, router]);
}

function Message({ state }: { state: PickupState }) {
  if (state?.error) return <p role="alert" className="mt-2 rounded-lg bg-beet/10 px-3 py-2 text-sm font-bold text-beet">{state.error}</p>;
  if (state?.success) return <p role="status" className="mt-2 rounded-lg bg-herb-soft px-3 py-2 text-sm font-bold text-herb">{state.success}</p>;
  return null;
}

// The box at the top of the page: type or scan the student's code
export function ConfirmCodeForm() {
  const [state, action, pending] = useActionState(confirmPickup, undefined);
  useRefreshOnSuccess(state);

  return (
    <form action={action} className="rounded-xl border-2 border-ink bg-surface p-5">
      <label htmlFor="code" className="font-display text-xl font-extrabold">Confirm a pickup</label>
      <p className="text-sm text-muted">Type or scan the code on the student&apos;s pass.</p>
      <div className="mt-3 flex gap-2">
        <input id="code" name="code" placeholder="LB-7K2QX" autoComplete="off" autoCapitalize="characters"
          className={`${input} mt-0 font-display text-lg font-extrabold tracking-wider`} />
        <button disabled={pending} className={btn}>{pending ? "Checking…" : "Confirm"}</button>
      </div>
      <Message state={state} />
    </form>
  );
}

// Buttons on a claimed listing card
export function ClaimedListingActions({ code, claimId, windowClosed }: { code: string; claimId: string; windowClosed: boolean }) {
  const [confirmState, confirmAction, confirming] = useActionState(confirmPickup, undefined);
  const [noShowState, noShowAction, marking] = useActionState(markNoShow, undefined);
  useRefreshOnSuccess(confirmState);
  useRefreshOnSuccess(noShowState);
  const busy = confirming || marking;

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <form action={confirmAction}>
          <input type="hidden" name="code" value={code} />
          <button disabled={busy} className={btn}>{confirming ? "Saving…" : "Confirm pickup"}</button>
        </form>
        {windowClosed && (
          <form action={noShowAction}>
            <input type="hidden" name="claimId" value={claimId} />
            <button disabled={busy} className={btnGhost}>{marking ? "Saving…" : "Mark no-show"}</button>
          </form>
        )}
      </div>
      <Message state={confirmState?.error || confirmState?.success ? confirmState : noShowState} />
    </div>
  );
}
