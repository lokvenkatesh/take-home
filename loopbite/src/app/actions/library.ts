"use server";

import { eq, not } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { safetyDocs } from "@/db/schema";
import { assertRole } from "@/lib/auth";
import { saveDoc, seedLibrary } from "@/lib/rag/library";

export type DocState = { error?: string; saved?: string } | undefined;
const refresh = () => revalidatePath("/admin", "layout");

const input = z.object({
  id: z.union([z.literal(""), z.uuid()]),
  title: z.string().trim().min(3, "Give the document a title").max(140),
  source: z.string().trim().min(2, "Say where it comes from, like USDA or your campus health office").max(200),
  url: z.union([z.literal(""), z.url("The link must be a full web address, starting with https://")]),
  body: z.string().trim().min(80, "Paste at least a paragraph of guidance (80+ characters)").max(30000, "Keep documents under 30,000 characters, or split them"),
});

export async function saveSafetyDoc(_prev: DocState, formData: FormData): Promise<DocState> {
  const admin = await assertRole("admin");
  const parsed = input.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const { chunks } = await saveDoc({ id: d.id || undefined, title: d.title, source: d.source, url: d.url || null, body: d.body }, admin.id);
  refresh();
  return { saved: `Saved “${d.title}”. ${chunks} passage${chunks === 1 ? "" : "s"} indexed.` };
}

export async function toggleSafetyDoc(formData: FormData) {
  await assertRole("admin");
  const id = z.uuid().parse(formData.get("id"));
  await db.update(safetyDocs).set({ active: not(safetyDocs.active), updatedAt: new Date() }).where(eq(safetyDocs.id, id));
  refresh();
}

export async function deleteSafetyDoc(formData: FormData) {
  await assertRole("admin");
  await db.delete(safetyDocs).where(eq(safetyDocs.id, z.uuid().parse(formData.get("id"))));
  refresh();
}

export async function loadStarterLibrary() {
  await assertRole("admin");
  await seedLibrary();
  refresh();
}
