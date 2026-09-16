"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../lib/admin-auth";
import { deleteEpisode, saveEpisode, uploadEpisodeAudio } from "../../../lib/trendcast";

export async function saveEpisodeAction(formData) {
  await requireAdmin();
  const title = String(formData.get("title") || "").trim();
  const slug = String(formData.get("slug") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const trendKeyword = String(formData.get("trend_keyword") || "").trim();
  const transcript = String(formData.get("transcript") || "").trim();
  const duration = Number.parseInt(String(formData.get("duration") || "90"), 10) || 90;
  const publishedAt =
    String(formData.get("published_at") || "").trim() || new Date().toISOString();
  const coverUrl = String(formData.get("cover_url") || "").trim() || "/trendcast/viralia-cover.png";
  const manualAudioUrl = String(formData.get("audio_url") || "").trim();
  const audioFile = formData.get("audio");

  if (!title) {
    throw new Error("El episodio necesita un título.");
  }

  const uploadedAudioUrl =
    audioFile && typeof audioFile === "object" && audioFile.size
      ? await uploadEpisodeAudio(slug || title, audioFile)
      : null;

  const savedEpisode = await saveEpisode({
    title,
    slug,
    description,
    trend_keyword: trendKeyword,
    transcript,
    duration,
    published_at: publishedAt,
    cover_url: coverUrl,
    audio_url: uploadedAudioUrl || manualAudioUrl || "/trendcast/audio/demo-queso.mp3",
  });

  revalidatePath("/viralia");
  revalidatePath("/trendcast");
  revalidatePath("/feed.xml");
  revalidatePath("/viralia/admin");
  revalidatePath("/trendcast/admin");
  revalidatePath(`/viralia/${savedEpisode.slug}`);
  revalidatePath(`/trendcast/${savedEpisode.slug}`);
}

export async function deleteEpisodeAction(formData) {
  await requireAdmin();
  const slug = String(formData.get("slug") || "").trim();
  const deleted = await deleteEpisode(slug);

  revalidatePath("/viralia");
  revalidatePath("/feed.xml");
  revalidatePath("/viralia/admin");
  revalidatePath(`/viralia/${deleted.slug}`);
}
