"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { claimListing } from "@/app/actions/claims";

export function ClaimButton({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState(claimListing, undefined);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.lost) return;
    // Lost the race: shake and fade the card, then refresh so it disappears
    formRef.current?.closest(".listing")?.classList.add("lost");
    const id = setTimeout(() => router.refresh(), 2300);
    return () => clearTimeout(id);
  }, [state, router]);

  return (
    <form ref={formRef} action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="listingId" value={listingId} />
      <button disabled={pending} className="btn">
        {pending ? <><span className="spin" aria-hidden="true" />Claiming…</> : "Claim pickup"}
      </button>
      {state?.error && <span role="alert" className="badge crit">{state.error}</span>}
    </form>
  );
}
