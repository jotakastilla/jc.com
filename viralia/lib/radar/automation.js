import { createHash } from "crypto";
import { getViraliaRadarTopics } from "../../scripts/generate-viralia-episode.mjs";
import { getSupabaseAdminClient } from "../database/server.js";
import { searchYouTubeOriginalSources } from "./youtube.js";
import { searchXNativeVideoCandidates } from "./x.js";
import { extractPreciseXAudio } from "./extract.js";

function fingerprint(url) {
  return createHash("sha256").update(`radar-candidate|${url}`).digest("hex");
}

function storagePathForXClip(topic) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).replace(/-/g, "/");
  const slug = String(topic || "actualidad").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 50) || "actualidad";
  return `viralia/clips/${day}/x-${slug}-${Date.now()}.mp3`;
}

async function wasStored(supabase, clipFingerprint) {
  const { data, error } = await supabase
    .from("viralia_radar_clips")
    .select("id")
    .eq("clip_fingerprint", clipFingerprint)
    .maybeSingle();
  return !error && Boolean(data?.id);
}

// Para candidatas nuevas la extracción ocurre antes de crear el registro. Así
// un vídeo de tráfico, música o una locución sin declaración no entra ni en la
// cola ni en el bucket; los registros históricos se mantienen aparte para que
// el equipo pueda revisarlos sin pérdida irreversible.
async function storeValidatedXVideo({ supabase, trend, video }) {
  const clipFingerprint = fingerprint(`x:${video.id}:${video.mediaKey}`);
  if (await wasStored(supabase, clipFingerprint)) return { skipped: true, ready: false };

  const extraction = await extractPreciseXAudio({ mediaUrl: video.mediaUrl, topic: trend.keyword });
  if (!extraction.ready) return { rejected: true, ready: false };

  const storagePath = storagePathForXClip(trend.keyword);
  const { error: uploadError } = await supabase.storage.from("viralia-radar").upload(storagePath, extraction.audioBuffer, { contentType: "audio/mpeg", upsert: false });
  if (uploadError) throw new Error(`No se pudo guardar el audio de X: ${uploadError.message}`);

  const { error: insertError } = await supabase.from("viralia_radar_clips").insert({
    title: `Declaración en X: ${extraction.selection.quote.slice(0, 140)}`,
    speaker: video.author,
    topic: trend.keyword,
    source_url: video.url,
    source_channel: "X",
    source_video_id: video.mediaKey,
    source_media_url: video.mediaUrl,
    published_at: video.postedAt,
    start_time: extraction.selection.start,
    end_time: extraction.selection.end,
    transcript: extraction.transcript,
    context: `Declaración validada automáticamente para «${trend.keyword}»: “${extraction.selection.quote}”. ${extraction.selection.reason} ${extraction.processing || ""}`.trim(),
    status: "ready",
    relevance_score: video.authorVerified ? 65 : 45,
    clip_fingerprint: clipFingerprint,
    storage_path: storagePath,
  });
  if (insertError) {
    await supabase.storage.from("viralia-radar").remove([storagePath]);
    // Una carrera con otra ejecución no deja un falso error ni un archivo
    // huérfano; el clip ya quedó guardado por la otra pasada.
    if (await wasStored(supabase, clipFingerprint)) return { skipped: true, ready: false };
    throw new Error(`No se pudo registrar la declaración validada: ${insertError.message}`);
  }
  return { ready: true };
}

// Descarga y prepara únicamente las fuentes que ya tienen vídeo directo. Así la
// cola puede vaciarse sin crear nuevas candidatas en cada pasada.
export async function processPendingRadarAudio({ supabase = getSupabaseAdminClient(), limit = 6 } = {}) {
  if (!supabase) throw new Error("Faltan las credenciales de Supabase para el radar de actualidad.");
  const { data: pendingXClips, error: pendingError } = await supabase
    .from("viralia_radar_clips")
    .select("id,source_media_url,source_url,topic")
    .eq("source_channel", "X")
    .eq("status", "detected")
    .is("storage_path", null)
    .not("source_media_url", "is", null)
    .order("relevance_score", { ascending: false })
    .limit(limit);
  if (pendingError) throw new Error(`No se pudo cargar la cola de audio de X: ${pendingError.message}`);

  let xAudioReady = 0;
  let xAudioRejected = 0;
  let xError = null;
  for (const clip of pendingXClips || []) {
    try {
      const extraction = await extractPreciseXAudio({ mediaUrl: clip.source_media_url, topic: clip.topic });
      if (!extraction.ready) {
        const { error: rejectionError } = await supabase.from("viralia_radar_clips").update({
          status: "rejected",
          transcript: extraction.transcript || "",
          context: `Descartado automáticamente: ${extraction.rejectionReason || "no contiene una declaración hablada relevante."}`,
        }).eq("id", clip.id);
        if (rejectionError) throw new Error(`No se pudo marcar el descarte: ${rejectionError.message}`);
        xAudioRejected += 1;
        continue;
      }
      const storagePath = storagePathForXClip(clip.topic);
      const { error: uploadError } = await supabase.storage.from("viralia-radar").upload(storagePath, extraction.audioBuffer, { contentType: "audio/mpeg", upsert: false });
      if (uploadError) throw new Error(`No se pudo guardar el audio de X: ${uploadError.message}`);
      const { error: updateError } = await supabase.from("viralia_radar_clips").update({
        storage_path: storagePath,
        start_time: extraction.selection.start,
        end_time: extraction.selection.end,
        transcript: extraction.transcript,
        context: `Declaración validada: ${extraction.selection.mode === "complete" ? "declaración completa" : "extracto breve"} para «${clip.topic}»: “${extraction.selection.quote}”. ${extraction.selection.reason} ${extraction.processing || ""}`.trim(),
        status: "ready",
      }).eq("id", clip.id);
      if (updateError) throw new Error(`No se pudo actualizar el corte de X: ${updateError.message}`);
      xAudioReady += 1;
    } catch (error) {
      xError = error instanceof Error ? error.message : "No se pudo extraer el audio de X.";
    }
  }
  return { pending: (pendingXClips || []).length, xAudioReady, xAudioRejected, xError };
}

export async function runViraliaRadarScan() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error("Faltan las credenciales de Supabase para el radar de actualidad.");

  const trends = await getViraliaRadarTopics(4);
  const candidates = [];
  const xVideos = [];
  let xError = null;
  for (const trend of trends.slice(0, 2)) {
    const context = [trend.keyword, ...(trend.newsTitles || []).slice(0, 1)].filter(Boolean).join(" · ");
    // YouTube sirve para descubrir y contrastar fuentes. Los cortes que Radar
    // almacena automáticamente proceden de vídeo nativo descargable de X.
    const search = await searchYouTubeOriginalSources(context);
    const source = search.results[0];
    try {
      const xSearch = await searchXNativeVideoCandidates(trend.keyword);
      xVideos.push(...xSearch.videos.map((video) => ({ trend, video })));
    } catch (error) {
      xError = error instanceof Error ? error.message : "X no está disponible.";
    }
    if (source) candidates.push({ trend, source });
  }

  // La cola solo procesa candidatos históricos: las detecciones nuevas se
  // validan antes de persistirlas.
  const processedAudio = await processPendingRadarAudio({ supabase, limit: 6 });
  if (!xError && processedAudio.xError) xError = processedAudio.xError;
  let xAudioReady = processedAudio.xAudioReady;
  let xAudioRejected = processedAudio.xAudioRejected;
  for (const { trend, video } of xVideos) {
    try {
      const result = await storeValidatedXVideo({ supabase, trend, video });
      if (result.ready) xAudioReady += 1;
      if (result.rejected) xAudioRejected += 1;
    } catch (error) {
      xError = error instanceof Error ? error.message : "No se pudo validar el vídeo de X.";
    }
  }

  return {
    ok: true,
    status: "scanned",
    trendsChecked: trends.length,
    sourcesFound: candidates.length,
    // Las fuentes de YouTube sirven para contrastar la tendencia, pero no se
    // guardan como cortes de Radar: no disponemos aún de una declaración de
    // audio validada.
    candidatesStored: 0,
    xVideoCandidatesFound: xVideos.length,
    xAudioReady,
    xAudioRejected,
    xStatus: xError ? "unavailable" : "ok",
    xError,
  };
}
