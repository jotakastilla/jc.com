"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../lib/admin-auth";
import { createRadarClip, setRadarClipStatus } from "../../../lib/radar/server";

export async function createRadarClipAction(formData) {
  await requireAdmin();
  await createRadarClip({
    title: formData.get("title"),
    speaker: formData.get("speaker"),
    topic: formData.get("topic"),
    sourceUrl: formData.get("source_url"),
    sourceChannel: formData.get("source_channel"),
    publishedAt: formData.get("published_at"),
    startTime: formData.get("start_time"),
    endTime: formData.get("end_time"),
    transcript: formData.get("transcript"),
    context: formData.get("context"),
    audioFile: formData.get("source_audio"),
  });
  revalidatePath("/viralia/radar");
}

export async function setRadarClipStatusAction(formData) {
  await requireAdmin();
  await setRadarClipStatus(String(formData.get("id") || ""), String(formData.get("status") || ""));
  revalidatePath("/viralia/radar");
}
