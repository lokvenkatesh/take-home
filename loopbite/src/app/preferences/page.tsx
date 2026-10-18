import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { PreferencesForm } from "@/components/PreferencesForm";

export default function PreferencesPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading…</p>}>
      <Preferences />
    </Suspense>
  );
}

async function Preferences() {
  const user = await requireRole("student");
  const [prefs] = await db
    .select({ categories: users.prefCategories, avoid: users.avoidAllergens, diet: users.dietNeeds })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  return (
    <>
      <AppHeader name={user.name} role={user.role} />
      <main className="mx-auto max-w-[1120px] px-5 py-8">
        <h1 className="text-3xl font-bold md:text-4xl">Preferences</h1>
        <p className="mt-2 max-w-2xl text-ink-2">
          Tell us what you like and what you can&apos;t eat. Food with allergens you avoid is hidden,
          and the rest is ranked for you.
        </p>
        <PreferencesForm initial={prefs} />
      </main>
    </>
  );
}
