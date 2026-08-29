import { randomUUID } from "crypto";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { spawn } from "child_process";
import ffmpegStatic from "ffmpeg-static";
import { validateSpokenStatement } from "./eligibility.mjs";

// El original es temporal: Radar guarda únicamente el MP3 resultante.
const MAX_MEDIA_BYTES = 250 * 1024 * 1024;

// Tratamiento pensado para voz informativa. No intenta borrar por completo el
// ambiente (a veces forma parte de la declaración), sino separar la voz de
// ruido constante, limpiar extremos y dejar todos los cortes al mismo nivel.
const SPEECH_TREATMENT = [
  "highpass=f=75",
  "lowpass=f=12000",
  "afftdn=nr=8:nf=-38",
  "acompressor=threshold=-18dB:ratio=2:attack=20:release=180:makeup=2",
  "loudnorm=I=-16:TP=-1.5:LRA=11",
].join(",");

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegStatic || "ffmpeg", args);
    let stderr = "";
    proc.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    proc.on("error", reject);
    proc.on("close", (code) => code === 0 ? resolve() : reject(new Error(`FFmpeg no pudo preparar el audio: ${stderr}`)));
  });
}

async function transcribe(audioPath) {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) throw new Error("Falta OPENAI_API_KEY para transcribir el vídeo.");
  const form = new FormData();
  form.append("file", new Blob([await readFile(audioPath)], { type: "audio/mpeg" }), "source.mp3");
  form.append("model", "whisper-1");
  form.append("language", "es");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form });
  if (!response.ok) throw new Error(`OpenAI no pudo transcribir el vídeo: ${response.status}`);
  return response.json();
}

function normalizeTokens(value = "") {
  return String(value).toLocaleLowerCase("es-ES").match(/[\p{L}\p{N}]+/gu) || [];
}

function fallbackSentenceSelection(transcript) {
  const words = Array.isArray(transcript.words) ? transcript.words : [];
  const text = String(transcript.text || "").trim();
  if (!words.length || !text) return null;
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
  const sentence = sentences.map((item) => item.trim()).find(Boolean);
  const tokens = normalizeTokens(sentence);
  if (!tokens.length) return null;

  const timedTokens = words.map((word) => normalizeTokens(word.word)[0] || "");
  let startIndex = -1;
  for (let index = 0; index <= timedTokens.length - tokens.length; index += 1) {
    if (tokens.every((token, offset) => token === timedTokens[index + offset])) {
      startIndex = index;
      break;
    }
  }
  if (startIndex < 0) return null;
  const endIndex = startIndex + tokens.length - 1;
  const start = Number(words[startIndex]?.start);
  const end = Number(words[endIndex]?.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end - start < 3 || end - start > 90) return null;
  return {
    start,
    end,
    quote: sentence,
    mode: end - start <= 7.05 ? "short" : "complete",
    reason: "Frase completa seleccionada por tiempos de transcripción; pendiente de aprobación editorial.",
  };
}

async function chooseQuote({ topic, transcript }) {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  const words = Array.isArray(transcript.words) ? transcript.words.map((word) => ({ start: word.start, end: word.end, word: word.word })) : [];
  if (!words.length) return null;
  const prompt = [
    "Selecciona un único corte de audio en español para respaldar una noticia de Viralia.",
    "Solo es elegible si se oye a una persona haciendo una declaración informativamente relevante y ligada al tema. Debe estar literalmente presente en la transcripción, ser comprensible por sí sola y no empezar ni acabar a mitad de frase.",
    "Rechaza música, ambiente de calle, motores, motos, efectos, ruido, aplausos, imágenes sin habla, locuciones sin una declaración útil, saludos y frases sin contenido noticioso.",
    "Primero intenta un extracto breve de 5 a 7 segundos. Si la frase termina antes y añadir silencio cambiaría su ritmo, se admite desde 3 segundos.",
    "Si no existe un extracto breve completo, puedes conservar una declaración completa de hasta 90 segundos. Nunca rellenes con silencio ni cortes una frase a la mitad.",
    "Prioriza una afirmación concreta de la persona que habla, no una introducción ni una opinión de terceros.",
    "Si no existe una declaración hablada completa y ligada al tema, devuelve eligible:false.",
    `Tema de la noticia: ${topic}`,
    `Palabras con tiempo: ${JSON.stringify(words)}`,
    "Devuelve JSON: {eligible:boolean,isSpokenStatement:boolean,isNewsRelevant:boolean,start:number,end:number,quote:string,mode:'short'|'complete',reason:string}.",
  ].join("\n\n");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini", temperature: 0, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] }),
  });
  if (!response.ok) throw new Error(`OpenAI no pudo elegir el corte: ${response.status}`);
  const choice = JSON.parse((await response.json())?.choices?.[0]?.message?.content || "{}");
  const start = Number(choice.start);
  const end = Number(choice.end);
  if (!choice.eligible || !choice.isSpokenStatement || !choice.isNewsRelevant || !Number.isFinite(start) || !Number.isFinite(end) || end - start < 3 || end - start > 90.05) {
    return null;
  }
  const selection = {
    start,
    end,
    mode: choice.mode === "complete" ? "complete" : "short",
    reason: String(choice.reason || "").trim(),
  };
  const validation = validateSpokenStatement({ transcript, selection });
  return validation.eligible ? { ...selection, quote: validation.quote } : null;
}

export async function extractPreciseXAudio({ mediaUrl, topic }) {
  const response = await fetch(mediaUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`No se pudo descargar el vídeo de X: ${response.status}`);
  const declaredSize = Number(response.headers.get("content-length") || "0");
  if (declaredSize > MAX_MEDIA_BYTES) throw new Error("El vídeo de X supera el límite operativo de 250 MB.");
  const videoBuffer = Buffer.from(await response.arrayBuffer());
  if (videoBuffer.length > MAX_MEDIA_BYTES) throw new Error("El vídeo de X supera el límite operativo de 250 MB.");

  const jobDir = path.join(tmpdir(), `viralia-radar-x-${randomUUID()}`);
  const videoPath = path.join(jobDir, "source.mp4");
  const audioPath = path.join(jobDir, "source.mp3");
  const clipPath = path.join(jobDir, "clip.mp3");
  await mkdir(jobDir, { recursive: true });
  try {
    await writeFile(videoPath, videoBuffer);
    await runFfmpeg(["-y", "-i", videoPath, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "64k", audioPath]);
    const transcript = await transcribe(audioPath);
    const selection = await chooseQuote({ topic, transcript });
    if (!selection) {
      return {
        ready: false,
        transcript: String(transcript.text || ""),
        rejectionReason: "No se ha validado una declaración hablada y relevante para la noticia.",
      };
    }
    await runFfmpeg([
      "-y", "-ss", String(selection.start), "-to", String(selection.end), "-i", audioPath,
      "-vn", "-af", SPEECH_TREATMENT, "-ac", "1", "-ar", "44100",
      "-c:a", "libmp3lame", "-q:a", "3", clipPath,
    ]);
    return {
      ready: true,
      audioBuffer: await readFile(clipPath),
      // Solo se conserva la declaración que superó la validación. La
      // transcripción completa puede contener introducciones, silencios o
      // ambiente y no debe confundirse con el contenido publicable.
      transcript: selection.quote,
      selection,
      processing: "Voz enfocada: reducción moderada de ruido, limpieza y normalización a −16 LUFS.",
    };
  } finally {
    await rm(jobDir, { recursive: true, force: true });
  }
}
