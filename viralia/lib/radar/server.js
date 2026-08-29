import { createHash, randomUUID } from "crypto";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { spawn } from "child_process";
import ffmpegStatic from "ffmpeg-static";
import { getSupabaseAdminClient } from "../database/server.js";
import { isPublicRadarClip, validateSpokenText } from "./eligibility.mjs";

const bucketName = "viralia-radar";
const allowedStatuses = new Set(["detected", "ready", "approved", "rejected", "used"]);

function cleanText(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function slugify(value = "") {
  return cleanText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 72) || "corte";
}

function fingerprint({ sourceUrl, startTime, endTime }) {
  return createHash("sha256").update(`${sourceUrl}|${startTime}|${endTime}`).digest("hex");
}

function getAdmin() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error("Faltan las credenciales de Supabase para el radar de actualidad.");
  return supabase;
}

function datePath(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(date).replace(/-/g, "/");
}

function youtubeVideoId(sourceUrl = "") {
  try {
    const url = new URL(sourceUrl);
    if (url.hostname === "youtu.be") return url.pathname.slice(1) || null;
    if (url.hostname.endsWith("youtube.com")) return url.searchParams.get("v") || (url.pathname.match(/^\/embed\/([^/]+)/)?.[1] || null);
  } catch {
    return null;
  }
  return null;
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegStatic || "ffmpeg", args);
    let stderr = "";
    proc.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    proc.on("error", (error) => reject(error));
    proc.on("close", (code) => code === 0 ? resolve() : reject(new Error(`FFmpeg no pudo recortar el audio: ${stderr}`)));
  });
}

export async function getRadarClips({ playableOnly = false, displayLimit = null } = {}) {
  const supabase = getAdmin();
  let query = supabase
    .from("viralia_radar_clips")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(80);
  if (playableOnly) query = query.not("storage_path", "is", null);
  const { data, error } = await query;
  if (error) throw new Error(`No se pudieron cargar los cortes: ${error.message}`);

  const publicClips = (data || []).filter((clip) => !playableOnly || isPublicRadarClip(clip));
  const clips = await Promise.all(publicClips.map(async (clip) => {
    const youtubeVideo = clip.source_channel === "YouTube"
      ? (clip.source_video_id || youtubeVideoId(clip.source_url))
      : youtubeVideoId(clip.source_url);
    if (!clip.storage_path) return { ...clip, youtube_video_id: youtubeVideo };
    const { data: signed } = await supabase.storage.from(bucketName).createSignedUrl(clip.storage_path, 60 * 30);
    return { ...clip, playback_url: signed?.signedUrl || null, youtube_video_id: youtubeVideo };
  }));
  // Lo que ya se puede escuchar siempre aparece antes que la cola de extracción.
  const isPlayable = (clip) => Boolean(clip.playback_url || clip.youtube_video_id);
  const sorted = clips.sort((a, b) => Number(isPlayable(b)) - Number(isPlayable(a)) || Number(Boolean(b.playback_url)) - Number(Boolean(a.playback_url)) || Number(b.relevance_score || 0) - Number(a.relevance_score || 0));
  return displayLimit ? sorted.slice(0, displayLimit) : sorted;
}

export async function createRadarClip({ title, speaker, topic, sourceUrl, sourceChannel, publishedAt, startTime, endTime, transcript, context, audioFile }) {
  const safeTitle = cleanText(title);
  const safeTopic = cleanText(topic);
  const safeSourceUrl = cleanText(sourceUrl);
  const start = Number(startTime);
  const end = Number(endTime);
  if (!safeTitle || !safeTopic || !safeSourceUrl) throw new Error("Título, tema y URL de fuente son obligatorios.");
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) throw new Error("El corte necesita un IN y OUT válidos.");
  if (end - start < 3 || end - start > 90) throw new Error("El audio debe durar entre 3 y 90 segundos.");
  const statement = validateSpokenText(transcript);
  if (!statement.eligible) throw new Error(`Radar solo acepta declaraciones habladas relevantes: ${statement.reason}`);

  const supabase = getAdmin();
  const clipFingerprint = fingerprint({ sourceUrl: safeSourceUrl, startTime: start, endTime: end });
  const { data: duplicate } = await supabase.from("viralia_radar_clips").select("id").eq("clip_fingerprint", clipFingerprint).maybeSingle();
  if (duplicate) throw new Error("Ese mismo audio ya existe en el radar de actualidad.");

  const base = {
    title: safeTitle,
    speaker: cleanText(speaker) || null,
    topic: safeTopic,
    source_url: safeSourceUrl,
    source_channel: cleanText(sourceChannel) || null,
    published_at: publishedAt ? new Date(publishedAt).toISOString() : null,
    start_time: start,
    end_time: end,
    // El texto guardado es la declaración elegida, no una transcripción de
    // ambiente anterior o posterior al corte. Es la misma prueba que usa la
    // vista pública antes de generar una URL firmada.
    transcript: statement.quote,
    context: cleanText(context),
    clip_fingerprint: clipFingerprint,
    relevance_score: 50,
    status: "detected",
  };

  if (!audioFile || !audioFile.size) {
    const { error } = await supabase.from("viralia_radar_clips").insert(base);
    if (error) throw new Error(`No se pudo registrar el candidato: ${error.message}`);
    return { status: "detected" };
  }

  if (audioFile.size > 20 * 1024 * 1024) throw new Error("La fuente de audio supera el máximo de 20 MB.");
  const jobDir = path.join(tmpdir(), `viralia-radar-${randomUUID()}`);
  const inputPath = path.join(jobDir, "source");
  const outputPath = path.join(jobDir, "clip.mp3");
  await mkdir(jobDir, { recursive: true });

  try {
    await writeFile(inputPath, Buffer.from(await audioFile.arrayBuffer()));
    await runFfmpeg(["-y", "-ss", String(start), "-to", String(end), "-i", inputPath, "-vn", "-ac", "2", "-ar", "44100", "-c:a", "libmp3lame", "-q:a", "3", outputPath]);
    const storagePath = `viralia/clips/${datePath()}/${slugify(speaker || "voz")}-${slugify(topic)}-${Date.now()}.mp3`;
    const { error: uploadError } = await supabase.storage.from(bucketName).upload(storagePath, await readFile(outputPath), { contentType: "audio/mpeg", upsert: false });
    if (uploadError) throw new Error(`No se pudo subir el corte: ${uploadError.message}`);
    const { error: insertError } = await supabase.from("viralia_radar_clips").insert({ ...base, storage_path: storagePath, audio_url: null, status: "ready" });
    if (insertError) {
      await supabase.storage.from(bucketName).remove([storagePath]);
      throw new Error(`El audio se subió, pero no se pudo guardar el corte: ${insertError.message}`);
    }
    return { status: "ready", storagePath };
  } finally {
    await rm(jobDir, { recursive: true, force: true });
  }
}

export async function setRadarClipStatus(id, status) {
  if (!allowedStatuses.has(status)) throw new Error("Estado no válido.");
  const { error } = await getAdmin().from("viralia_radar_clips").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(`No se pudo actualizar el corte: ${error.message}`);
}
