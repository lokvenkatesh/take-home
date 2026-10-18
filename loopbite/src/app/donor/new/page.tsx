import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { ListingForm } from "@/components/ListingForm";

export default function NewListingPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading…</p>}>
      <NewListing />
    </Suspense>
  );
}

async function NewListing() {
  const user = await requireRole("donor");
  return (
    <>
      <AppHeader name={user.name} role={user.role} businessName={user.businessName} />
      <main className="mx-auto max-w-2xl px-5 py-8">
        <h1 className="text-3xl font-bold md:text-4xl">Post leftover food</h1>
        <p className="mt-2 text-ink-2">Students nearby see it the moment you post.</p>
        <ListingForm />
      </main>
    </>
  );
}
