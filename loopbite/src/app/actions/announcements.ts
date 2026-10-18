"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { dismissals } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function dismissAnnouncement(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  // Dismissing twice is harmless thanks to the unique index
  await db.insert(dismissals).values({ userId: user.id, announcementId: id.data }).onConflictDoNothing();
  revalidatePath("/", "layout");
}
