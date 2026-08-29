import { access, copyFile, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { pathToFileURL } from "url";
import { createClient } from "@supabase/supabase-js";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import sharp from "sharp";
import { selectEditorialStories, selectSpecialEditorialStory } from "./viralia-editorial.mjs";

const projectRoot = process.cwd();
loadLocalEnvironment();
const runtimeWorkRoot = process.env.VERCEL === "1" ? "/tmp" : projectRoot;
const outDir = path.join(runtimeWorkRoot, "trendcast-demo");
const publicAudioDir = process.env.VERCEL === "1"
  ? path.join(outDir, "audio")
  : path.join(projectRoot, "public", "trendcast", "audio");
const reactionsDir = path.join(projectRoot, "public", "trendcast", "reactions");
const latestMetaPath = path.join(outDir, "latest.json");
const editorialSelectionPath = path.join(outDir, "editorial-selection.json");
const viraliaStyleGuidePath = path.resolve(
  projectRoot,
  process.env.VIRALIA_STYLE_GUIDE_FILE || path.join("docs", "viralia-estructura-a-revisar.txt")
);
const remoteAudioAssets = {
  intro: { key: "entrada-viralia", objectPath: "entrada viralia .mp3" },
  credits: { key: "salida-viralia", objectPath: "salida viralia.mp3" },
  disaster: { key: "base-desastres", objectPath: "Bases Viralia epic desastres.mp3" },
  serious: { key: "base-serias", objectPath: "Bases Viralia serias.mp3" },
  impact: { key: "base-impactos", objectPath: "Bases Viralia impactos.mp3" },
  happy: { key: "base-felices", objectPath: "Bases Viralia felices .mp3" },
};
const remoteAssetsBucketName = "viralia-assets";
const trendsFeedUrl = "https://trends.google.com/trending/rss?geo=ES";
const bedLeadInSeconds = 2.4;
const outroTailSeconds = 0.12;
const ffmpegBinary = process.env.VIRALIA_FFMPEG_PATH || ffmpegStatic || "ffmpeg";
const ffprobeBinary = process.env.VIRALIA_FFPROBE_PATH || ffprobeStatic.path || "ffprobe";

// Voces de boletín ya utilizadas en Vocolia.
const speakerA = {
  // Voz femenina aprobada. La variable permite una audición puntual distinta.
  voiceId: process.env.VIRALIA_HOST_A_VOICE_ID || "TuDkG5WVXA7xXDOgih0z",
  label: "Host A",
};
const speakerB = {
  voiceId: "7KOBCMWq7jGQUKV5YMuW",
  label: "Host B",
};

const reactionLibrary = {
  DANI_DOUBT_SOFT: "dani-mmm-01.mp3",
  DANI_DOUBT_WARM: "dani-mmhum01_2.mp3",
  DANI_BRIDGE_EHH: "dani-bueno ehh 01.mp3",
  DANI_BRIDGE_HEHE: "dani-bueno hehe 01.mp3",
  DANI_REACT_UFF: "dani-uff  01 .mp3",
  DANI_REACT_BUFF: "dani-buff  01.mp3",
  DANI_LAUGH_LIGHT: "dani-ahjaja01.mp3",
  DANI_LAUGH_OPEN: "dani-jajaja01.mp3",
  DANI_TAG_RARO: "dani-uyuyuy internet esta raro 01.mp3",
  LAURA_BRIDGE_BUENO: "laura-bueno01.mp3",
  LAURA_REACT_EH: "laura-eh-01.mp3",
  LAURA_REACT_TOTAL: "laura-total-01.mp3",
  LAURA_REACT_NOHOMBRE: "laura-nohombre-01_1.mp3",
  LAURA_REACT_WOW: "laura-wow-01.mp3",
  LAURA_REACT_UYUYUY: "laura-uyuyuy-01.mp3",
  LAURA_REACT_MADREMIA: "laura-buf madre mia-01.mp3",
  LAURA_LAUGH_LIGHT: "laura-ahjaja01.mp3",
};

function createReactionSegment(speaker, reactionKey) {
  const fileName = reactionLibrary[reactionKey];
  if (!fileName) return null;
  return {
    type: "reaction",
    speaker,
    reactionKey,
    fileName,
  };
}

const outroSegments = [
  { type: "tts", speaker: speakerA, text: "Y hasta aquí el boletín de hoy." },
  { type: "tts", speaker: speakerB, text: "Pero en Viralia no esperamos a mañana: si pasa algo importante, volvemos y te lo contamos." },
  { type: "tts", speaker: speakerA, text: "Nos escuchamos en cuanto haya algo que entender." },
];

function loadLocalEnvironment() {
  const envPath = path.join(projectRoot, ".env.local");
  try {
    process.loadEnvFile(envPath);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
}

function shouldPublishEpisode() {
  return !process.argv.includes("--no-publish") && process.env.VIRALIA_PUBLISH !== "false";
}

function getSupabasePublisher() {
  const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const serviceRole = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!url || !serviceRole) {
    throw new Error(
      "No se puede publicar: faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  try {
    const parsedUrl = new URL(url);
    if (!/^https?:$/.test(parsedUrl.protocol)) {
      throw new Error("Unsupported protocol");
    }
  } catch {
    throw new Error("No se puede publicar: NEXT_PUBLIC_SUPABASE_URL no es una URL válida.");
  }

  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function radarTopicMatchScore(clip, stories = []) {
  const clipWords = new Set(String(clip?.topic || "").toLocaleLowerCase("es-ES").match(/[\p{L}\p{N}]+/gu) || []);
  const overlap = stories.reduce((score, story) => {
    const storyWords = String(story?.keyword || "").toLocaleLowerCase("es-ES").match(/[\p{L}\p{N}]+/gu) || [];
    return score + storyWords.filter((word) => clipWords.has(word)).length;
  }, 0);
  return overlap * 30 + Math.min(40, Number(clip?.relevance_score) || 0);
}

async function findRadarOpeningClip(editorialSelection) {
  const selectedStories = editorialSelection?.selected || [];
  if (!selectedStories.length) return null;
  const supabase = getSupabasePublisher();
  const { data, error } = await supabase
    .from("viralia_radar_clips")
    .select("id,title,topic,storage_path,transcript,relevance_score")
    .in("status", ["ready", "approved"])
    .not("storage_path", "is", null)
    .order("relevance_score", { ascending: false })
    .limit(12);
  if (error) {
    console.warn(`Radar no está disponible para la apertura: ${error.message}`);
    return null;
  }
  const scored = (data || [])
    .map((clip) => ({ ...clip, matchScore: radarTopicMatchScore(clip, selectedStories) }))
    .sort((a, b) => b.matchScore - a.matchScore);
  const candidate = scored[0];
  const requiresOpening = editorialSelection?.episode_status === "ESPECIAL" || selectedStories[0]?.editorial_treatment === "ABRIR_SOBRIO";
  return candidate && (requiresOpening ? candidate.matchScore >= 30 : candidate.matchScore >= 80) ? candidate : null;
}

async function getReadyRadarClipById(id) {
  if (!id) return null;
  const { data, error } = await getSupabasePublisher()
    .from("viralia_radar_clips")
    .select("id,title,topic,storage_path,transcript,relevance_score")
    .eq("id", id)
    .in("status", ["ready", "approved"])
    .not("storage_path", "is", null)
    .maybeSingle();
  if (error) {
    console.warn(`No se pudo cargar el corte listo de Radar: ${error.message}`);
    return null;
  }
  return data || null;
}

async function materializeRadarOpeningClip(clip) {
  if (!clip?.storage_path) return null;
  const supabase = getSupabasePublisher();
  const { data, error } = await supabase.storage.from("viralia-radar").download(clip.storage_path);
  if (error || !data) {
    console.warn(`No se pudo descargar el corte aprobado de Radar: ${error?.message || "sin archivo"}`);
    return null;
  }
  const outputPath = path.join(outDir, `radar-opening-${clip.id}.mp3`);
  await writeFile(outputPath, Buffer.from(await data.arrayBuffer()));
  return { ...clip, filePath: outputPath };
}

async function markRadarClipUsed(id) {
  if (!id) return;
  const { error } = await getSupabasePublisher()
    .from("viralia_radar_clips")
    .update({ status: "used", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) console.warn(`El episodio se publicó, pero no se pudo marcar el corte de Radar como usado: ${error.message}`);
}

export async function publishGeneratedEpisode({
  slug,
  title,
  description,
  transcript,
  article,
  articleImages = [],
  coverImage = null,
  duration,
  publishedAt,
  trendKeyword,
  audioPath,
}) {
  const supabase = getSupabasePublisher();
  const bucketName = "trendcast-audio";
  const mediaBucketName = "trendcast-media";
  const storagePath = `episodes/${slug}.mp3`;
  const scriptStoragePath = `scripts/${slug}.txt`;
  const audioBuffer = await readFile(audioPath);

  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (bucketsError) {
    throw new Error(`No se pudo comprobar el bucket de audio: ${bucketsError.message}`);
  }

  if (!buckets?.some((bucket) => bucket.name === bucketName)) {
    const { error: createBucketError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 52428800,
    });
    if (createBucketError) {
      throw new Error(`No se pudo crear el bucket de audio: ${createBucketError.message}`);
    }
  }

  if ((articleImages.length || coverImage) && !buckets?.some((bucket) => bucket.name === mediaBucketName)) {
    const { error: createMediaBucketError } = await supabase.storage.createBucket(mediaBucketName, {
      public: true,
      fileSizeLimit: 10485760,
    });
    if (createMediaBucketError) {
      throw new Error(`No se pudo crear el bucket de imágenes: ${createMediaBucketError.message}`);
    }
  }

  const { error: uploadError } = await supabase.storage.from(bucketName).upload(storagePath, audioBuffer, {
    contentType: "audio/mpeg",
    upsert: true,
  });
  if (uploadError) {
    throw new Error(`No se pudo subir el audio: ${uploadError.message}`);
  }

  const { error: scriptUploadError } = await supabase.storage.from(bucketName).upload(
    scriptStoragePath,
    Buffer.from(transcript, "utf8"),
    { contentType: "text/plain; charset=utf-8", upsert: true }
  );
  if (scriptUploadError) {
    throw new Error(`No se pudo subir el guion: ${scriptUploadError.message}`);
  }

  const { data: publicAudio } = supabase.storage.from(bucketName).getPublicUrl(storagePath);
  if (!publicAudio?.publicUrl) {
    throw new Error("Supabase no devolvió una URL pública para el audio.");
  }
  const { data: publicScript } = supabase.storage.from(bucketName).getPublicUrl(scriptStoragePath);

  const publicArticleImages = [];
  for (const [index, image] of articleImages.entries()) {
    const imagePath = `articles/${slug}/${String(index + 1).padStart(2, "0")}.webp`;
    const { error: imageUploadError } = await supabase.storage
      .from(mediaBucketName)
      .upload(imagePath, image.buffer, { contentType: "image/webp", upsert: true });
    if (imageUploadError) {
      throw new Error(`No se pudo subir una imagen del artículo: ${imageUploadError.message}`);
    }
    const { data: publicImage } = supabase.storage.from(mediaBucketName).getPublicUrl(imagePath);
    if (publicImage?.publicUrl) {
      publicArticleImages.push({ url: publicImage.publicUrl, alt: image.alt, caption: image.caption || "" });
    }
  }

  let publicCoverUrl = null;
  if (coverImage?.buffer) {
    const coverPath = `covers/${slug}.webp`;
    const { error: coverUploadError } = await supabase.storage
      .from(mediaBucketName)
      .upload(coverPath, coverImage.buffer, { contentType: "image/webp", upsert: true });
    if (coverUploadError) {
      console.warn(`No se pudo subir la portada personalizada: ${coverUploadError.message}`);
    } else {
      const { data: publicCover } = supabase.storage.from(mediaBucketName).getPublicUrl(coverPath);
      publicCoverUrl = publicCover?.publicUrl || null;
    }
  }

  const { error: episodeError } = await supabase.from("trendcast_episodes").upsert(
    {
      id: slug,
      title,
      slug,
      description,
      audio_url: publicAudio.publicUrl,
      cover_url: publicCoverUrl || publicArticleImages[0]?.url || process.env.VIRALIA_COVER_URL || "/trendcast/viralia-cover.png",
      duration,
      published_at: publishedAt,
      trend_keyword: trendKeyword || "actualidad",
      transcript,
      article_body: article,
      article_images: publicArticleImages,
    },
    { onConflict: "slug" }
  );
  if (episodeError) {
    throw new Error(`El audio se subió, pero no se pudo publicar el episodio: ${episodeError.message}`);
  }

  return {
    published: true,
    storagePath,
    scriptStoragePath,
    audioUrl: publicAudio.publicUrl,
    scriptUrl: publicScript?.publicUrl || null,
    coverUrl: publicCoverUrl || publicArticleImages[0]?.url || null,
    articleImages: publicArticleImages,
    episodeUrl: `${String(process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "")}/viralia/${slug}`,
  };
}

async function generateExtendedArticle({ editorialSelection, conversation }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Falta OPENAI_API_KEY para crear el artículo extendido.");

  const approvedStories = editorialSelection.selected.map((story) => ({
    topic: story.keyword,
    category: story.category,
    temperature: story.temperature,
    headlines: story.newsTitles,
    sources: story.sources,
  }));
  const prompt = [
    "Redacta un artículo extendido en español de España para la web de Viralia.",
    "Solo puedes usar estas historias ya aprobadas y los titulares aportados. No inventes hechos, cifras ni citas.",
    "Debe complementar el audio: explicar contexto, por qué genera conversación y qué se sabe, sin repetir el guion literalmente.",
    "Tono claro, útil y periodístico-digital. Sin humor ni valoraciones gratuitas. Entre 650 y 900 palabras.",
    "Escribe el nombre completo de instituciones, cadenas y organizaciones en la primera mención. Por ejemplo, usa 'Televisión Española', no solo 'TVE'. Las siglas solo pueden aparecer después si aportan claridad.",
    "Devuelve JSON: {intro:string, sections:[{heading:string, paragraphs:string[]}], image_briefs:[{alt:string,caption:string,prompt:string}] }.",
    "Crea exactamente dos image_briefs: ilustraciones editoriales abstractas relacionadas con las historias, sin texto, logotipos, rostros reconocibles ni recrear personas reales.",
    `Título del episodio: ${conversation.title}`,
    `Descripción: ${conversation.description}`,
    `Historias aprobadas: ${JSON.stringify(approvedStories)}`,
  ].join("\n\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.25,
      response_format: { type: "json_object" },
    }),
  });
  if (!response.ok) throw new Error(`OpenAI no pudo crear el artículo: ${response.status} ${await response.text()}`);
  const payload = await response.json();
  const article = safeParseJsonObject(payload?.choices?.[0]?.message?.content || "");
  if (!article?.intro || !Array.isArray(article?.sections)) throw new Error("OpenAI devolvió un artículo con formato inválido.");
  return {
    intro: compactWhitespace(article.intro),
    sections: article.sections.slice(0, 4).map((section) => ({
      heading: compactWhitespace(section?.heading),
      paragraphs: (Array.isArray(section?.paragraphs) ? section.paragraphs : []).map(compactWhitespace).filter(Boolean).slice(0, 4),
    })).filter((section) => section.heading && section.paragraphs.length),
    image_briefs: (Array.isArray(article.image_briefs) ? article.image_briefs : []).slice(0, 2).map((image) => ({
      alt: compactWhitespace(image?.alt),
      caption: compactWhitespace(image?.caption),
      prompt: compactWhitespace(image?.prompt),
    })).filter((image) => image.alt && image.prompt),
  };
}

async function generateArticleImages(article) {
  if (process.argv.includes("--no-publish") || process.env.VIRALIA_GENERATE_IMAGES === "false") return [];
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Falta OPENAI_API_KEY para generar las imágenes del artículo.");
  const images = [];
  for (const brief of article.image_briefs || []) {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-image-1-mini",
        prompt: `Ilustración editorial contemporánea para una revista digital española. ${brief.prompt} Estética fotográfica conceptual, composición limpia, sin texto, sin logotipos, sin marcas, sin personas identificables ni rostros reconocibles.`,
        size: "1024x1024",
        quality: "medium",
        output_format: "webp",
      }),
    });
    if (!response.ok) throw new Error(`OpenAI no pudo crear una imagen: ${response.status} ${await response.text()}`);
    const payload = await response.json();
    const base64 = payload?.data?.[0]?.b64_json;
    if (!base64) throw new Error("OpenAI no devolvió datos de imagen.");
    images.push({ buffer: Buffer.from(base64, "base64"), alt: brief.alt, caption: brief.caption });
  }
  return images;
}

function escapeSvgText(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function uniqueCoverSeed(seed = "") {
  return [...String(seed)].reduce((value, char) => ((value * 31) + char.charCodeAt(0)) >>> 0, 2166136261);
}

async function generateUniqueFallbackCover({ title, topics = [], seed = "" }) {
  const value = uniqueCoverSeed(`${seed}:${title}:${topics.join(",")}`);
  const hueA = value % 360;
  const hueB = (hueA + 68 + (value % 70)) % 360;
  const hueC = (hueB + 95) % 360;
  const episodeLabel = compactWhitespace(topics.slice(0, 3).join(" · ")).slice(0, 82).toUpperCase();
  const overlay = Buffer.from(`
    <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="base" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="hsl(${hueA} 65% 19%)"/>
          <stop offset="52%" stop-color="hsl(${hueB} 68% 25%)"/>
          <stop offset="100%" stop-color="#081225"/>
        </linearGradient>
        <radialGradient id="glow" cx="70%" cy="24%" r="72%">
          <stop offset="0%" stop-color="hsl(${hueC} 90% 70%)" stop-opacity=".86"/>
          <stop offset="100%" stop-color="hsl(${hueC} 90% 45%)" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1024" height="1024" fill="url(#base)"/>
      <rect width="1024" height="1024" fill="url(#glow)"/>
      <circle cx="788" cy="258" r="244" fill="none" stroke="#ffffff" stroke-opacity=".18" stroke-width="3"/>
      <circle cx="788" cy="258" r="184" fill="none" stroke="#ffffff" stroke-opacity=".14" stroke-width="2"/>
      <path d="M-80 780 C190 610 338 920 568 720 S912 564 1100 720" fill="none" stroke="#ffffff" stroke-opacity=".28" stroke-width="5"/>
      <path d="M-80 850 C190 680 338 990 568 790 S912 634 1100 790" fill="none" stroke="#ffffff" stroke-opacity=".15" stroke-width="3"/>
      <rect x="82" y="648" width="860" height="218" rx="32" fill="#07101f" fill-opacity=".70" stroke="#ffffff" stroke-opacity=".35" stroke-width="2"/>
      <text x="124" y="735" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="92" font-weight="700" letter-spacing="7">VIRALIA</text>
      <text x="126" y="794" fill="#dce8ff" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="600" letter-spacing="3">${escapeSvgText(episodeLabel || "TENDENCIAS DEL DÍA")}</text>
      <text x="126" y="834" fill="#bcd1ed" font-family="Arial, Helvetica, sans-serif" font-size="19" letter-spacing="4">EPISODIO ÚNICO</text>
    </svg>
  `);
  return {
    buffer: await sharp(overlay).webp({ quality: 92 }).toBuffer(),
    alt: `Portada de Viralia: ${title}`,
  };
}

export async function generateViraliaCover({ title, editorialSelection, seed = "" }) {
  const topics = (editorialSelection?.selected || []).map((story) => story.keyword).filter(Boolean).slice(0, 4);
  if (process.argv.includes("--no-publish")) return null;
  if (process.env.VIRALIA_GENERATE_COVER === "false") {
    return generateUniqueFallbackCover({ title, topics, seed });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return generateUniqueFallbackCover({ title, topics, seed });
  const special = editorialSelection?.episode_status === "ESPECIAL";
  const imagePrompt = [
    "Portada editorial cuadrada para un podcast español de actualidad digital.",
    `Concepto visual del día: ${topics.join(", ") || title}.`,
    special
      ? "Tono sobrio, periodístico y contenido; transmite relevancia pública sin imágenes gráficas ni sensacionalismo."
      : "Composición dinámica y elegante que combine los temas del día de forma abstracta.",
    "Sin texto, sin letras, sin logotipos, sin marcas, sin personas identificables y sin rostros reconocibles.",
    "Deja el centro visual suficientemente limpio para una cabecera superpuesta.",
  ].join(" ");

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-image-1-mini",
        prompt: imagePrompt,
        size: "1024x1024",
        quality: "medium",
        output_format: "webp",
      }),
    });
    if (!response.ok) throw new Error(`OpenAI cover error ${response.status}`);
    const payload = await response.json();
    const base64 = payload?.data?.[0]?.b64_json;
    if (!base64) throw new Error("OpenAI no devolvió datos para la portada.");

    const subtitle = special ? "EDICIÓN ESPECIAL" : "LO MÁS BUSCADO HOY";
    const overlay = Buffer.from(`
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#07111f" stop-opacity="0.18"/>
            <stop offset="55%" stop-color="#07111f" stop-opacity="0.06"/>
            <stop offset="100%" stop-color="#07111f" stop-opacity="0.82"/>
          </linearGradient>
        </defs>
        <rect width="1024" height="1024" fill="url(#shade)"/>
        <rect x="142" y="423" width="740" height="178" rx="28" fill="#07111f" fill-opacity="0.72" stroke="#ffffff" stroke-opacity="0.5" stroke-width="2"/>
        <text x="512" y="515" text-anchor="middle" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="104" font-weight="700" letter-spacing="8">VIRALIA</text>
        <text x="512" y="562" text-anchor="middle" fill="#b9ddff" font-family="Arial, Helvetica, sans-serif" font-size="25" letter-spacing="7">${escapeSvgText(subtitle)}</text>
      </svg>
    `);
    return {
      buffer: await sharp(Buffer.from(base64, "base64"))
        .resize(1024, 1024, { fit: "cover" })
        .composite([{ input: overlay, top: 0, left: 0 }])
        .webp({ quality: 92 })
        .toBuffer(),
      alt: `Portada de Viralia: ${title}`,
    };
  } catch (error) {
    // La publicación jamás se frena por una portada: se crea una alternativa única para este episodio.
    console.warn(`No se pudo generar la portada personalizada: ${error instanceof Error ? error.message : String(error)}`);
    return generateUniqueFallbackCover({ title, topics, seed });
  }
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const executable = command === "ffmpeg" ? ffmpegBinary : command === "ffprobe" ? ffprobeBinary : command;
    const proc = spawn(executable, args);
    let stderr = "";
    proc.on("error", (error) => {
      reject(new Error(`No se pudo ejecutar ${command}: ${error.message}`));
    });
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} failed (${code}): ${stderr}`));
    });
  });
}

async function retryExternalStep(label, task, attempts = 2) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      console.warn(`${label} falló (intento ${attempt}/${attempts}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw lastError;
}

export async function getViraliaRuntimeHealth() {
  const requiredEnvironment = [
    "VIRALIA_KEY_ELEVENLABS",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  const missingEnvironment = requiredEnvironment.filter((key) => !String(process.env[key] || "").trim());
  if (missingEnvironment.length) {
    throw new Error(`Faltan variables de producción: ${missingEnvironment.join(", ")}`);
  }

  await run("ffmpeg", ["-version"]);
  await run("ffprobe", ["-version"]);
  return { ok: true, ffmpeg: true, ffprobe: true, remoteAssetsBucket: remoteAssetsBucketName };
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function downloadRemoteAudioAsset(asset) {
  if (!asset?.objectPath) throw new Error("Falta la referencia del recurso de audio remoto.");
  const supabase = getSupabasePublisher();
  const assetDir = path.join(outDir, "remote-assets");
  const localPath = path.join(assetDir, `${asset.key || path.basename(asset.objectPath)}.mp3`);

  if (await fileExists(localPath)) return localPath;

  await mkdir(assetDir, { recursive: true });
  const { data, error } = await supabase.storage.from(remoteAssetsBucketName).download(asset.objectPath);
  if (error || !data) {
    throw new Error(`No se pudo descargar ${asset.objectPath} desde ${remoteAssetsBucketName}: ${error?.message || "sin datos"}`);
  }
  await writeFile(localPath, Buffer.from(await data.arrayBuffer()));
  return localPath;
}

function buildTimestampLabel(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}_${hh}-${min}`;
}

function formatSpanishDateTime(date = new Date()) {
  const dateText = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Madrid",
  }).format(date);
  const timeText = new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Madrid",
  }).format(date);

  return {
    dateText,
    timeText,
  };
}

function getDayPeriod(hour24) {
  if (hour24 >= 6 && hour24 < 12) {
    return "de la manana";
  }
  if (hour24 >= 12 && hour24 < 20) {
    return "de la tarde";
  }
  return "de la noche";
}

function getHourName(hour12) {
  const names = {
    1: "la una",
    2: "las dos",
    3: "las tres",
    4: "las cuatro",
    5: "las cinco",
    6: "las seis",
    7: "las siete",
    8: "las ocho",
    9: "las nueve",
    10: "las diez",
    11: "las once",
    12: "las doce",
  };
  return names[hour12] || "las doce";
}

function formatColloquialSpanishTime(date = new Date()) {
  const madridHour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Europe/Madrid",
    }).format(date)
  );
  const madridMinute = Number(
    new Intl.DateTimeFormat("en-GB", {
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/Madrid",
    }).format(date)
  );

  const hour12 = madridHour % 12 === 0 ? 12 : madridHour % 12;
  const nextHour12 = (hour12 % 12) + 1;
  const period = getDayPeriod(madridHour);

  if (madridMinute === 0) {
    return `${getHourName(hour12)} en punto ${period}`;
  }

  if (madridMinute === 15) {
    return `${getHourName(hour12)} y cuarto ${period}`;
  }

  if (madridMinute === 30) {
    return `${getHourName(hour12)} y media ${period}`;
  }

  if (madridMinute === 45) {
    return `${getHourName(nextHour12)} menos cuarto ${period}`;
  }

  if (madridMinute < 30) {
    return `${getHourName(hour12)} y ${madridMinute} ${period}`;
  }

  return `${getHourName(nextHour12)} menos ${60 - madridMinute} ${period}`;
}

function compactWhitespace(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function applyTtsDictionary(text = "") {
  const currencySafeText = String(text).replace(
    /\b(\d{1,3}(?:[.\s]\d{3})+|\d+)(?:,\d{2})?\s*(?:€(?=\s|[.,;:!?]|$)|euros?\b)/gi,
    (_match, amount) => `${String(amount).replace(/[.\s]/g, "")} euros`
  );

  return currencySafeText
    .replace(/\bRTVE\b/g, "erre te uve e")
    .replace(/\bRFEF\b/g, "erre efe efe")
    .replace(/\bF1\b/g, "fórmula 1")
    .replace(/\bFormula 1\b/g, "fórmula 1")
    .replace(/\bFormula Uno\b/g, "fórmula 1")
    .replace(/\bIA\b/g, "i a")
    .replace(/\bAI\b/g, "a i")
    .replace(/\bUCO\b/g, "u ce o")
    .replace(/\bEEUU\b/g, "Estados Unidos")
    .replace(/\bTVE\b/g, "te uve e")
    .replace(/\bHN\b/g, "Hacker News");
}

function shapeTextForSpeaker(text = "", speakerLabel = "") {
  return compactWhitespace(applyTtsDictionary(text))
    .replace(/[;:]+\s*/g, ". ")
    .replace(/\s*([.!?])\s*/g, "$1 ")
    .trim();
}

function slugify(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function decodeXmlEntities(value = "") {
  return String(value)
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function stripTags(value = "") {
  return decodeXmlEntities(String(value).replace(/<[^>]+>/g, ""));
}

function extractTagValue(block, tagName) {
  const pattern = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = block.match(pattern);
  return match ? stripTags(match[1]) : "";
}

function extractAllTagValues(block, tagName) {
  const pattern = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "gi");
  const values = [];
  for (const match of block.matchAll(pattern)) {
    values.push(stripTags(match[1]));
  }
  return values.filter(Boolean);
}

function parseTrafficScore(raw = "") {
  const cleaned = String(raw).replace(/[^\d]/g, "");
  return Number.parseInt(cleaned || "0", 10) || 0;
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function parseGoogleTrendsRss(xml = "") {
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];

  return itemBlocks.map((block, index) => {
    const keyword = extractTagValue(block, "title");
    const approxTraffic = extractTagValue(block, "ht:approx_traffic");
    const newsTitles = extractAllTagValues(block, "ht:news_item_title").slice(0, 3);
    const sources = unique(extractAllTagValues(block, "ht:news_item_source").slice(0, 3));
    const relatedSearches = unique(
      newsTitles
        .flatMap((headline) =>
          headline
            .split(/[,:()\-]/)
            .map((part) => compactWhitespace(part))
            .filter((part) => part.length >= 4 && !part.toLowerCase().includes(keyword.toLowerCase()))
        )
        .slice(0, 4)
    );

    return {
      id: `trend-${index + 1}`,
      keyword,
      approxTraffic,
      trafficScore: parseTrafficScore(approxTraffic),
      newsTitles,
      sources,
      relatedSearches,
    };
  });
}

async function fetchTopGoogleTrends(limit = 10) {
  const response = await fetch(trendsFeedUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Google Trends RSS error ${response.status}: ${await response.text()}`);
  }

  const xml = await response.text();
  const trends = parseGoogleTrendsRss(xml)
    .filter((item) => item.keyword)
    .slice(0, limit);

  if (!trends.length) {
    throw new Error("Google Trends no devolvió tendencias aprovechables.");
  }

  return trends;
}

export async function getViraliaRadarTopics(limit = 6) {
  return fetchTopGoogleTrends(limit);
}

export async function findViraliaSpecialCandidate() {
  const topTrends = await fetchTopGoogleTrends(20);
  return {
    topTrends,
    editorialSelection: selectSpecialEditorialStory(topTrends),
  };
}

async function fetchRedditFeed(subreddit) {
  const response = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=3`, {
    headers: {
      "User-Agent": "LocalResetTrendcast/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Reddit ${subreddit} error ${response.status}`);
  }

  const data = await response.json();
  const posts = Array.isArray(data?.data?.children) ? data.data.children : [];
  return posts
    .map((item) => item?.data)
    .filter(Boolean)
    .slice(0, 3)
    .map((post) => compactWhitespace(post.title || ""))
    .filter(Boolean);
}

async function fetchHackerNewsSignals() {
  const response = await fetch(
    "https://hn.algolia.com/api/v1/search_by_date?query=AI&tags=story&hitsPerPage=3",
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error(`Hacker News error ${response.status}`);
  }

  const data = await response.json();
  const hits = Array.isArray(data?.hits) ? data.hits : [];
  return hits
    .slice(0, 3)
    .map((hit) => compactWhitespace(hit.title || hit.story_title || ""))
    .filter(Boolean);
}

async function fetchLiveSourceSignals() {
  const sources = [];

  try {
    const [artificial, alexa] = await Promise.all([
      fetchRedditFeed("artificial"),
      fetchRedditFeed("alexa"),
    ]);
    const redditHeadlines = [...artificial.slice(0, 2), ...alexa.slice(0, 1)];
    if (redditHeadlines.length) {
      sources.push({
        name: "Reddit",
        context: "debates recientes en r/artificial y r/alexa",
        headlines: redditHeadlines,
      });
    }
  } catch {}

  try {
    const hackerNewsHeadlines = await fetchHackerNewsSignals();
    if (hackerNewsHeadlines.length) {
      sources.push({
        name: "Hacker News",
        context: "historias recientes sobre IA y herramientas",
        headlines: hackerNewsHeadlines,
      });
    }
  } catch {}

  return sources;
}

export function buildTrendBriefing(editorialSelection) {
  const lines = editorialSelection.selected.map((trend, index) => {
    const whyNow = trend.newsTitles?.[0]
      ? `Motivo probable según titulares: ${trend.newsTitles[0]}.`
      : "";
    const related = trend.relatedSearches?.length
      ? `Subtemas o ángulos ligados: ${trend.relatedSearches.join("; ")}.`
      : "";
    const headlines = trend.newsTitles?.length
      ? `Titulares guía: ${trend.newsTitles.join(" | ")}.`
      : "";
    const groupedTerms = trend.source_keywords?.length > 1
      ? `Señales agrupadas de la misma historia: ${trend.source_keywords.join(", ")}.`
      : "";
    return `${index + 1}. ${trend.keyword}. Rol: ${trend.editorial_role || "HISTORIA_SECUNDARIA"}. Categoría: ${trend.category}. Temperatura: ${trend.temperature}. Tratamiento: ${trend.editorial_treatment}. ${groupedTerms} ${whyNow} ${related} ${headlines}`.trim();
  });

  return [
    "Nombre del podcast: Viralia.",
    "Google Trends España se usa solamente como radar. Un selector editorial ha agrupado sus señales y aprobado las historias siguientes.",
    `Tema editorial del episodio: ${editorialSelection.editorial_theme}.`,
    `Historia principal: ${editorialSelection.main_story?.keyword || editorialSelection.selected[0]?.keyword || "la primera historia aprobada"}. Debe abrir y recibir más contexto que las demás.`,
    "Objetivo: hacer un episodio conversacional entre dos hosts sobre estas historias aprobadas, y ninguna otra.",
    "Es una edición de mañana: puede incluir noticias nacidas ayer o durante la noche si siguen siendo útiles para despertarse con el repaso del día. No descartes un tema por no haber empezado esta mañana.",
    "Usar los subtemas y titulares ligados para resolver por qué cada una está generando conversación hoy.",
    "El oyente debe salir entendiendo qué noticia o hecho ha disparado cada tendencia.",
    "No sonar a telediario clásico. Debe sonar a podcast ágil, actual, con cultura de internet y un punto periodístico.",
    "No inventes datos, titulares, temas ni contexto que no aparezcan aquí. Una tendencia no equivale a un hecho: si el contexto no basta, usa una formulación prudente o no afirmes la causa. Nunca atribuyas información a una institución, fuente o persona que el briefing no nombre expresamente; tampoco inventes cifras, lugares, antecedentes o consecuencias.",
    editorialSelection.episode_status === "ESPECIAL"
      ? "Es una edición especial monográfica. Trata una única noticia con tono sobrio, explica qué se sabe y evita por completo humor, curiosidades o cierres alegres."
      : "",
    "Si la primera historia tiene tratamiento ABRIR_SOBRIO, debe abrir el bloque 1 por sí sola, sin humor ni reacción. Al cambiar a la siguiente, usa una frase breve y neutral que deje claro que empieza otro asunto; nunca la compares ni la remates con ligereza.",
    "",
    "Historias aprobadas por edición:",
    ...lines,
  ].join("\n");
}

function buildIntroSegments(generatedAt) {
  const greeting = getMadridGreeting(generatedAt);
  return [
    {
      speaker: speakerA,
      text: `${greeting}. Esto es Viralia. Vamos con las noticias y las conversaciones que están moviendo internet ahora mismo.`,
    },
  ];
}

function getMadridGreeting(date = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hour12: false,
    timeZone: "Europe/Madrid",
  }).format(date));
  if (hour >= 6 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

async function loadViraliaStyleGuide() {
  try {
    const guide = compactWhitespace(await readFile(viraliaStyleGuidePath, "utf8"));
    if (!guide) throw new Error("vacío");
    return guide;
  } catch (error) {
    throw new Error(`Publicación bloqueada: no se pudo cargar el libro de estilo de Viralia (${error instanceof Error ? error.message : "error desconocido"}).`);
  }
}

function validateViraliaEpisodeStyle(conversation, { mode = "daily" } = {}) {
  if (mode === "special") return;
  const blocks = Array.isArray(conversation?.blocks) ? conversation.blocks : [];
  if (blocks.length !== 4) throw new Error("Publicación bloqueada por libro de estilo: el boletín diario debe tener cuatro bloques.");

  const narration = blocks.flatMap((block) => block.segments || []).filter((segment) => segment.type === "tts");
  if (narration.length < 12 || blocks.some((block) => (block.segments || []).filter((segment) => segment.type === "tts").length < 3)) {
    throw new Error("Publicación bloqueada por libro de estilo: faltan las tres intervenciones informativas de algún bloque.");
  }
  const words = narrationWordCount(narration);
  if (words < 500 || words > 650) {
    throw new Error(`Publicación bloqueada por libro de estilo: el guion tiene ${words} palabras y debe tener entre 500 y 650.`);
  }
  const tones = new Set(blocks.map((block) => block.tone));
  if (tones.size !== 4) throw new Error("Publicación bloqueada por libro de estilo: cada noticia necesita una base musical distinta.");

  const text = narration.map((segment) => segment.text).join(" ").toLocaleLowerCase("es-ES");
  const bannedPhrases = ["añadir o excluir", "podemos fiar", "podemos confiar", "las conclusiones", "reglas editoriales"];
  if (bannedPhrases.some((phrase) => text.includes(phrase))) {
    throw new Error("Publicación bloqueada por libro de estilo: el guion habla del proceso editorial en vez de dar el boletín.");
  }
}

function buildConversationSystemPromptEs(styleGuide = "") {
  return [
    "Eres guionista de Viralia.",
    "Viralia es radio moderna, podcast conversacional, actualidad ligera y cultura de internet.",
    "Viralia no es un informativo clasico, no es un telediario y no debe sonar a IA leyendo Google Trends.",
    "Construye un boletín con jerarquía editorial: abre con una historia principal desarrollada y después incorpora solo las pocas historias aprobadas que completan el pulso del día.",
    "La referencia es el ritmo claro y cercano de un magazine informativo de mañana, sin imitar ni reproducir la voz o fórmulas de ningún programa concreto.",
    "El protagonista es internet: qué sigue, qué teclea, con qué se obsesiona y qué dice eso del día.",
    "Escribes diálogos en español de España para dos locutores: host_a (la primera voz, Maricarmen) y host_b (la segunda voz).",
    "host_a conduce, ordena y acelera. host_b aporta una precisión, una pregunta útil o introduce el siguiente bloque. No finjáis una tertulia ni rellenéis con asentimientos.",
    "El tono debe ser oral, agil, natural, humano y con una ironia ligera.",
    "El humor debe ser sutil, ocasional y acertado. Nunca meta chistes faciles, bromas absurdas o risas porque si.",
    "Cada intervención debe aportar información nueva, contexto, una transición útil o personalidad real. Elimina asentimientos como 'así es', 'totalmente', 'desde luego' o 'qué interesante' cuando no añadan nada.",
    "No repitas la misma idea con otras palabras.",
    "No repitas varias veces 'la gente busca', 'se está buscando' o fórmulas parecidas.",
    "Si algo ya se ha dicho, avanza.",
    "Evita tono corporativo, institucional, academico, documental o periodistico clasico.",
    "Usa frases cortas y medias.",
    "Puede haber pequenas interrupciones y cambios de ritmo, pero evita risas escritas salvo que sean muy naturales y de verdad encajen.",
    "Nunca metas opinion politica, agresiva, polarizante o moralista.",
    "El texto debe escribirse pensando en como suena.",
    "Incluye pronunciaciones naturales y fáciles de leer en voz alta. Prohibidos los tartamudeos, palabras repetidas, muletillas y repeticiones como 'un, un' o 'que, que'.",
    "Debes respetar este libro de estilo de producción sin mencionarlo nunca en el guion:",
    styleGuide,
    "A veces pueden llamarse por su nombre, por ejemplo 'Laura' o 'Dani', pero sin abusar.",
    "Cuando falten datos exactos, usa formulaciones prudentes como 'todo apunta a' o 'parece relacionado con'.",
    "Si una historia incluye muertes, heridos, incendios, violencia o daño personal, el tono es sobrio: no hagas bromas, remates, ironías ni reacciones emocionales ligeras.",
    "No uses frases como 'vaya que palo', 'menuda combinación', 'qué fuerte' o 'internet está raro' ante una tragedia.",
    "No uses nunca la expresión 'menudo lío' ni variantes como 'menuda locura' o 'menudo follón'.",
    "Las reacciones cálidas y el humor solo caben en historias claramente ligeras, culturales, curiosas o positivas.",
  ].join(" ");
}

function buildConversationUserPromptEs({ briefingText, duracionObjetivoSeg, tonoDominante, isSpecial = false, requiredStories = [] }) {
  const target = Math.min(270, Math.max(240, Number(duracionObjetivoSeg) || 240));
  const style = String(tonoDominante || "moderno, conversacional, ágil").trim();
  return `
Genera un guion conversacional para un episodio corto de podcast en España.

Duración objetivo: ${target} segundos.
Objetivo de palabras: 600 a 760 palabras. Nunca menos de 600 palabras de locución.

Formato obligatorio:
1) Conversación entre dos voces.
2) Entre 3 y 4 bloques claramente distintos, según las historias disponibles.
3) Las entradas y salidas de marca ya las aporta el montaje de audio: no escribas bienvenida, despedida ni menciones a Local Reset Studios.
4) Cada bloque debe declarar un tono: disaster, serious, impact o happy.

Reglas de redacción:
- Debe haber dos voces: host_a y host_b.
- host_a es la primera voz y host_b la segunda voz.
- Debe contener entre 20 y 28 intervenciones de locución, repartidas entre las dos voces.
- El centro del episodio es por qué internet está pendiente de eso hoy.
- Debe sonar a morning show moderno y a conversacion real, no a resumen robotico.
- Es el boletín para despertarse: mezcla novedades de primera hora con las historias de ayer que todavía explican de qué se habla esta mañana.
- ${isSpecial ? "Es una edición especial: tono sobrio de principio a fin, sin humor, reacciones ligeras ni curiosidades de cierre." : "El humor tiene que ser fino, ocasional y exclusivo de historias ligeras."}
- En historias de muertes, accidentes, heridos, incendios o daño personal: tono sobrio, sin reacción, sin humor y sin cierres ingeniosos.
- No metas chistes gratuitos.
- No pongas risas como jaja, jeje o hahaha si no son imprescindibles y totalmente naturales.
- Frases cortas y locutables.
- Mantén intervenciones locutables de entre 16 y 30 palabras. No acortes el episodio eliminando contexto necesario.
- Las cifras de dinero se escriben siempre en palabras o como una cifra sin separadores, seguida de "euros". Nunca separes con una pausa la cantidad de "euros": debe sonar seguido, por ejemplo "quinientos mil euros".
- No incluyas bienvenida ni despedida: el sistema las añade por separado.
- No repitas dos veces la misma explicacion ni la misma reaccion.
- Cada bloque debe avanzar.
- Antes de responder, comprueba que el guion completo tiene al menos 600 palabras de locución. No lo cierres antes de alcanzar ese mínimo.
- Usa todas las historias aprobadas del briefing y no menciones ninguna otra tendencia. Si varias señales están agrupadas, trátalas como una sola historia.
- Debes nombrar de forma explícita cada una de estas historias aprobadas: ${requiredStories.map((story) => story.keyword).filter(Boolean).join("; ") || "las del briefing"}. No omitas ninguna.
- Dedica contexto suficiente a cada historia; no reemplaces una noticia aprobada por una curiosidad inventada. Si hay una noticia política aprobada, debe tener su propio tramo claro, descriptivo y neutral.
- No añadas instituciones, fuentes, cifras, antecedentes, hoteles, lugares, declaraciones o detalles que no aparezcan literalmente en el briefing. Si no se sabe la causa exacta de una tendencia, dilo con prudencia o pasa a la siguiente historia.
- ${isSpecial ? "Desarrolla la única historia aprobada en cuatro pasos: qué ha ocurrido, qué está confirmado, por qué importa y qué conviene seguir. No rellenes con otros temas." : "Desarrolla la HISTORIA_PRINCIPAL: qué ha pasado, qué sabemos, por qué se habla de ello, por qué importa y qué queda por seguir solo si el briefing lo permite. Las demás historias pueden compartir bloque para que no suene a lista plana."}
- La palabra o nombre buscado debe quedar claro cuando entre en escena.
- Usa variedad verbal. Alterna entre formulas como: se dispara, entra en radar, media España está pendiente, se llena de consultas, se teclea mucho, se cuela en todas partes, se pone a circular, se vuelve obsesión.
- Puedes mencionar Google Trends solo como radar si de verdad ayuda, pero sin convertir el guion en una lista de fuentes.
- Cita medios solo cuando aporten contexto real y rapido, por ejemplo ABC, MARCA o El Confidencial.
- Si el briefing trae señales de Reddit o Hacker News, integralas como conversacion natural.
- Ejemplos de tono validos: "ojo porque", "y aqui viene lo curioso", "internet esta raro hoy", "media Espana esta pendiente de esto".
- Evita frases vacias como "esto ha generado interes", "todo el mundo habla de" o "la gente esta buscando" repetido una y otra vez.
- El episodio debe sentirse como una pequena historia del dia, no como una lista.
- Estructura orientativa:
  bloque 1: HISTORIA_PRINCIPAL, con contexto suficiente; abre de forma directa, sin una introducción larga.
  bloque 2: segunda historia relevante, con cambio de energía solo si es natural.
  bloque 3: tercera historia o LO_QUE_SE_ESTA_MOVIENDO, explicando por qué genera conversación.
  bloque 4 opcional: HISTORIA_PARA_CONTAR solo si el briefing incluye CIERRE_LIGERO; si no, cierra de forma natural tras el último bloque relevante.
- Cada bloque debe sentirse autocontenido y tener su propio mini arco.
- Si nombras a una persona famosa o un tema viral, explica el hecho concreto que dispara la busqueda.
- El cierre solo puede ser ligero si hay una historia ligera aprobada. En otro caso, debe ser natural, breve y respetuoso.
- Tono: ${style}.

Briefing:
"""
${String(briefingText || "").trim()}
"""

Devuelve SOLO JSON válido con esta forma exacta:
{
  "title": "titulo corto, llamativo y con gancho periodistico-digital",
  "description": "descripcion breve que resuma el episodio e invite a seguir el podcast y comentar",
  "blocks": [
    {
      "id": "block_1",
      "tone": "serious",
      "segments": [
        { "speaker": "host_a", "text": "..." },
        { "speaker": "host_b", "text": "..." }
      ]
    },
    {
      "id": "block_2",
      "tone": "impact",
      "segments": [
        { "speaker": "host_a", "text": "..." },
        { "speaker": "host_b", "text": "..." }
      ]
    },
    {
      "id": "block_3",
      "tone": "happy",
      "segments": [
        { "speaker": "host_a", "text": "..." },
        { "speaker": "host_b", "text": "..." }
      ]
    }
  ],
  "full_text": "texto unido final",
  "duration_estimated_sec": 0
}
`.trim();
}

function safeParseJsonObject(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function parseReactionAwareText(text = "", speaker) {
  const chunks = [];
  const source = compactWhitespace(String(text || ""));
  const pattern = /\[([A-Z_]+)\]/g;
  let lastIndex = 0;

  for (const match of source.matchAll(pattern)) {
    const rawText = compactWhitespace(source.slice(lastIndex, match.index));
    if (rawText) {
      chunks.push({
        type: "tts",
        speaker,
        text: rawText,
      });
    }

    const reactionKey = String(match[1] || "").trim();
    if (reactionLibrary[reactionKey]) {
      chunks.push({
        type: "reaction",
        speaker,
        reactionKey,
        fileName: reactionLibrary[reactionKey],
      });
    }

    lastIndex = match.index + match[0].length;
  }

  const tailText = compactWhitespace(source.slice(lastIndex));
  if (tailText) {
    chunks.push({
      type: "tts",
      speaker,
      text: tailText,
    });
  }

  return chunks;
}

function normalizeModelBlock(block, fallbackId = "block_1") {
  const rawSegments = Array.isArray(block?.segments) ? block.segments : [];
  const segments = rawSegments
    .map((item) => ({
      speaker:
        String(item?.speaker || "").trim().toLowerCase() === "host_b"
          ? speakerB
          : speakerA,
      text: cleanNarrationText(String(item?.text || "")),
    }))
    .filter((item) => item.text)
    .flatMap((item) => parseReactionAwareText(item.text, item.speaker));

  return {
    id: String(block?.id || fallbackId),
    tone: ["disaster", "serious", "impact", "happy"].includes(String(block?.tone || "").toLowerCase())
      ? String(block.tone).toLowerCase()
      : "impact",
    segments,
  };
}

function cleanNarrationText(text = "") {
  let cleaned = compactWhitespace(text);
  let previous;
  do {
    previous = cleaned;
    cleaned = cleaned.replace(/\b([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)(?:\s*[,;:]\s*|\s+)\1\b/gi, "$1");
  } while (cleaned !== previous);
  return cleaned;
}

function missingRequiredStoryMentions(segments = [], requiredStories = []) {
  const scriptText = String(segments.filter((segment) => segment.type === "tts").map((segment) => segment.text).join(" "))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-ES");
  return requiredStories.filter((story) => {
    const anchors = String(story?.keyword || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es-ES")
      .match(/[\p{L}\p{N}]{5,}/gu) || [];
    return anchors.length && !anchors.some((anchor) => scriptText.includes(anchor));
  }).map((story) => story.keyword);
}

function narrationWordCount(segments = []) {
  return segments
    .filter((segment) => segment.type === "tts")
    .flatMap((segment) => String(segment.text || "").match(/[\p{L}\p{N}]+/gu) || [])
    .length;
}

function expandShortEditorialNarration(blocks = [], requiredStories = [], minimumWords = 600) {
  const expanded = blocks.map((block) => ({ ...block, segments: [...block.segments] }));
  if (!expanded.length || narrationWordCount(expanded.flatMap((block) => block.segments)) >= minimumWords) return expanded;

  for (const [index, story] of requiredStories.entries()) {
    const block = expanded[index % expanded.length];
    const headlines = (story.newsTitles || []).slice(1, 3).map((headline) => compactWhitespace(headline)).filter(Boolean);
    const evidence = headlines.length
      ? `La conversación alrededor de ${story.keyword} suma además estos frentes: ${headlines.join(". ")}.`
      : `La conversación alrededor de ${story.keyword} sigue abierta y concentra atención durante la jornada.`;
    block.segments.push({ type: "tts", speaker: index % 2 === 0 ? speakerB : speakerA, text: evidence });
  }

  const editorialClosers = [
    "La próxima actualización será la que aclare cómo evoluciona este asunto durante el día.",
    "Ese es el punto en el que queda la historia esta mañana.",
    "Habrá que mirar los siguientes pasos para saber hasta dónde llega esta novedad.",
    "Con estos datos, así queda el asunto a esta hora.",
  ];
  let currentWords = narrationWordCount(expanded.flatMap((block) => block.segments));
  let index = 0;
  while (currentWords < minimumWords) {
    const blockIndex = index % expanded.length;
    expanded[blockIndex].segments.push({
      type: "tts",
      speaker: index % 2 === 0 ? speakerA : speakerB,
      text: editorialClosers[index % editorialClosers.length],
    });
    currentWords = narrationWordCount(expanded.flatMap((block) => block.segments));
    index += 1;
  }
  return expanded;
}

function appendMissingStorySummaries(blocks = [], missingStories = [], requiredStories = []) {
  if (!missingStories.length || !blocks.length) return blocks;
  const closingBlock = blocks.at(-1);
  for (const [index, keyword] of missingStories.entries()) {
    const story = requiredStories.find((item) => item.keyword === keyword);
    const headline = compactWhitespace(String(story?.newsTitles?.[0] || ""));
    const text = headline
      ? `También entra en el radar ${keyword}. Los titulares disponibles hablan de ${headline}. Por ahora, ese es el contexto que podemos confirmar.`
      : `También entra en el radar ${keyword}. Por ahora no hay contexto suficiente para explicar más allá de que está generando conversación.`;
    closingBlock.segments.push({ type: "tts", speaker: index % 2 === 0 ? speakerA : speakerB, text });
  }
  return blocks;
}

export function buildEditorialFallbackConversation(editorialSelection = {}, { openingClip = null, reason = "" } = {}) {
  const stories = (editorialSelection?.selected || []).slice(0, 4);
  if (!stories.length) {
    throw new Error("No hay historias editoriales suficientes para construir un guion de contingencia.");
  }

  // Fórmula de boletín: cuatro noticias, tres intervenciones naturales y una base distinta por bloque.
  // No introduce explicaciones sobre el proceso editorial ni relleno conversacional.
  const bulletinTones = ["impact", "happy", "serious", "disaster"];
  const blockClosers = [
    "La secuencia de anuncios y respuestas mantiene el foco en esta historia, una de las que mejor resume el pulso informativo de la jornada.",
    "El interés crece porque cualquier decisión puede modificar el escenario y mover de nuevo la conversación en cuestión de horas.",
    "Las reacciones alrededor del caso sitúan este asunto entre los que más presencia tienen hoy en la agenda pública.",
    "Con este tema cerramos el recorrido por las noticias que están reuniendo más atención y comentarios a lo largo del día.",
  ];
  const contextForCategory = (category = "") => {
    const normalized = String(category).toLowerCase();
    if (normalized.includes("deporte")) {
      return "El tramo final del mercado suele concentrar movimientos, decisiones de plantilla y muchas miradas sobre los clubes implicados. Por eso cada novedad gana velocidad y se convierte enseguida en conversación entre aficionados.";
    }
    if (normalized.includes("econom")) {
      return "Es una cifra que aterriza en la economía cotidiana y conecta con una conversación mayor sobre salarios, gasto de los hogares y poder adquisitivo. Por eso el dato ha ganado peso durante la jornada.";
    }
    if (normalized.includes("cultura") || normalized.includes("entretenimiento")) {
      return "La noticia ha activado a una comunidad que sigue muy de cerca cada anuncio. Cuando una historia cultural regresa con novedades, el eco se multiplica rápido entre quienes ya la conocen y quienes se acercan por primera vez.";
    }
    return "La noticia ha abierto un debate que va más allá del titular y concentra atención durante el día. Sus efectos, las reacciones y los próximos movimientos marcarán cómo evoluciona la conversación en las próximas horas.";
  };
  const blocks = stories.map((story, index) => {
    const headlines = (story.newsTitles || [])
      .map((headline) => compactWhitespace(String(headline)))
      .filter((headline) => headline && !/[.…]{2,}/.test(headline));
    const [headline = "", secondary = "", third = ""] = headlines;
    const topic = compactWhitespace(String(story.keyword || "la actualidad del día"));
    const isMain = index === 0;
    const firstLine = isMain
      ? `Abrimos con ${topic}. ${headline || `Es uno de los temas que más conversación concentra hoy.`}`
      : `Cambiamos de asunto. ${topic} entra en el boletín de hoy. ${headline || "La noticia ha ganado presencia durante la jornada."}`;
    const secondLine = secondary
      ? `La historia suma además este movimiento: ${secondary}`
      : `El tema se ha instalado entre las conversaciones más activas del día y mantiene abierto el foco sobre sus próximos pasos.`;
    const thirdLine = `${third ? `Y hay un tercer elemento que completa el panorama: ${third}` : "El asunto sigue marcando parte de la agenda de hoy."} ${contextForCategory(story.category)} ${blockClosers[index % blockClosers.length]}`;
    return {
      id: `block_${index + 1}`,
      tone: bulletinTones[index % bulletinTones.length],
      segments: [
        { type: "tts", speaker: index % 2 === 0 ? speakerA : speakerB, text: firstLine },
        { type: "tts", speaker: index % 2 === 0 ? speakerB : speakerA, text: secondLine },
        { type: "tts", speaker: index % 2 === 0 ? speakerA : speakerB, text: thirdLine },
      ],
    };
  });
  // Si el servicio de guion falla, esta ruta sigue alcanzando la duración del
  // boletín sin inventar nuevas historias ni dejar un episodio a medias.
  const completedBlocks = expandShortEditorialNarration(blocks, stories, 520);
  const framedBlocks = addProgramFraming(completedBlocks, openingClip);
  const segments = framedBlocks.flatMap((block) => block.segments);
  const main = stories[0];
  return {
    title: compactWhitespace(`Viralia: ${stories.map((story) => story.keyword).join(", ")}`),
    description: compactWhitespace(`El boletín de tendencias de hoy: ${stories.map((story) => story.keyword).join(", ")}.`),
    fullText: segments.filter((segment) => segment.type === "tts").map((segment) => segment.text).join(" "),
    blocks: framedBlocks,
    segments,
    fallback: true,
    fallbackReason: reason,
  };
}

function addProgramFraming(blocks = [], openingClip = null) {
  const framed = blocks.filter((block) => block?.segments?.length).map((block) => ({ ...block, segments: [...block.segments] }));
  if (!framed.length) return framed;
  const secondHostGreeting = {
    type: "tts",
    speaker: speakerB,
    text: `${getMadridGreeting()}. Y empezamos por la historia que está ocupando todas las pantallas.`,
  };
  if (openingClip?.filePath) {
    framed[0].segments.unshift({
      type: "radar_clip",
      filePath: openingClip.filePath,
      clipId: openingClip.id,
      title: openingClip.title,
      transcript: openingClip.transcript || "",
    });
    // Un corte no puede quedarse huérfano: la primera voz lo identifica y
    // explica enseguida por qué abre el boletín.
    framed[0].segments.splice(1, 0, {
      type: "tts",
      speaker: speakerA,
      text: `Este es un corte de ${compactWhitespace(openingClip.title || "Viralia Radar")}. Lo escuchamos al comienzo porque resume la noticia principal de esta mañana.`,
    });
    framed[0].segments.splice(2, 0, secondHostGreeting);
  } else {
    framed[0].segments.unshift(secondHostGreeting);
  }
  return framed;
}

function chunkSegmentsIntoBlocks(segments = []) {
  const safeSegments = segments.filter(Boolean);
  if (!safeSegments.length) {
    return [
      { id: "block_1", tone: "impact", segments: [] },
      { id: "block_2", tone: "impact", segments: [] },
      { id: "block_3", tone: "impact", segments: [] },
    ];
  }

  const size = Math.ceil(safeSegments.length / 3);
  return [
    { id: "block_1", tone: "impact", segments: safeSegments.slice(0, size) },
    { id: "block_2", tone: "impact", segments: safeSegments.slice(size, size * 2) },
    { id: "block_3", tone: "impact", segments: safeSegments.slice(size * 2) },
  ];
}

function maybeReactionAfterSegment(segment, index, totalSegments) {
  if (!segment?.text || segment.type === "reaction") return null;
  if (index >= totalSegments - 2) return null;

  const text = String(segment.text || "");
  const lower = text.toLowerCase();
  const speaker = segment.speaker;

  if (speaker.label === speakerB.label) {
    if (/[!?]/.test(text) && /madre mía|madre mia|vaya|menuda|wow|sorpresa|ojo/.test(lower)) {
      return createReactionSegment(speakerB, "LAURA_REACT_MADREMIA");
    }
    if (/totalmente|claro|exacto|sí,? y|sí\.?$/i.test(text)) {
      return createReactionSegment(speakerB, "LAURA_REACT_TOTAL");
    }
    if (/qué|que|curioso|raro|nervioso|ansiedad|presión|presion/i.test(lower) && text.length < 90) {
      return createReactionSegment(speakerB, "LAURA_REACT_EH");
    }
  }

  if (speaker.label === speakerA.label) {
    if (/ojo|duda|salida|mercado|rompe|sorpresa|tensión|tension|última hora|ultima hora/i.test(lower)) {
      return createReactionSegment(speakerA, "DANI_DOUBT_WARM");
    }
    if (/internet hoy está raro|internet hoy esta raro|día raro|dia raro/i.test(lower)) {
      return createReactionSegment(speakerA, "DANI_TAG_RARO");
    }
  }

  return null;
}

function addInternalReactionNotes(segments = []) {
  return segments;
}

export async function generateConversationScript(briefing, durationTarget = 240, { isSpecial = false, openingClip = null, requiredStories = [], attempt = 0, styleGuide = "" } = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Falta OPENAI_API_KEY.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: buildConversationSystemPromptEs(styleGuide) },
        {
          role: "user",
          content: buildConversationUserPromptEs({
            briefingText: briefing,
            duracionObjetivoSeg: durationTarget,
            tonoDominante: "moderno, ágil, conversacional, con cultura de internet",
            isSpecial,
            requiredStories,
          }),
        },
      ],
      temperature: 0.45,
      max_tokens: 2200,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI text error ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const rawContent = String(data?.choices?.[0]?.message?.content || "").trim();
  const parsed = safeParseJsonObject(rawContent);
  if (!parsed) {
    throw new Error("OpenAI no devolvió JSON válido para la conversación.");
  }

  const modelBlocks = Array.isArray(parsed.blocks)
    ? parsed.blocks.slice(0, 4).map((block, index) => normalizeModelBlock(block, `block_${index + 1}`))
    : [];

  const fallbackSegments = Array.isArray(parsed.segments)
    ? parsed.segments
        .map((item) => ({
          speaker:
            String(item?.speaker || "").trim().toLowerCase() === "host_b"
              ? speakerB
              : speakerA,
          text: compactWhitespace(String(item?.text || "")),
        }))
        .filter((item) => item.text)
        .flatMap((item) => parseReactionAwareText(item.text, item.speaker))
    : [];

  const blocks = modelBlocks.length ? modelBlocks : chunkSegmentsIntoBlocks(fallbackSegments);
  const flattenedSegments = blocks.flatMap((block) => block.segments);

  if (!flattenedSegments.length) {
    throw new Error("El generador no devolvió segmentos locutables.");
  }
  const missingStories = missingRequiredStoryMentions(flattenedSegments, requiredStories);
  const wordCount = narrationWordCount(flattenedSegments);
  const tooShort = wordCount < 600;
  if (missingStories.length || tooShort) {
    if (attempt < 2) {
      const validationNotes = [
        missingStories.length ? `omitió estas historias aprobadas: ${missingStories.join(", ")}` : "",
        tooShort ? `solo tiene ${wordCount} palabras; el mínimo absoluto es 600` : "",
      ].filter(Boolean).join(" y ");
      return generateConversationScript(
        `${briefing}\n\nVALIDACIÓN OBLIGATORIA: el borrador anterior ${validationNotes}. Corrígelo con información limitada al briefing.`,
        durationTarget,
        { isSpecial, openingClip, requiredStories, attempt: 1, styleGuide }
      );
    }
    const completedBlocks = expandShortEditorialNarration(
      appendMissingStorySummaries(blocks, missingStories, requiredStories),
      requiredStories,
      600
    );
    const enrichedBlocks = addProgramFraming(completedBlocks.map((block) => ({
      ...block,
      segments: addInternalReactionNotes(block.segments),
    })), openingClip);
    const enrichedSegments = enrichedBlocks.flatMap((block) => block.segments);
    return {
      title: compactWhitespace(String(parsed.title || "Lo más buscado hoy en España")),
      description: compactWhitespace(String(parsed.description || "Lo más buscado del momento explicado en audio.")),
      fullText: enrichedSegments.filter((segment) => segment.type === "tts").map((segment) => segment.text || "").join(" "),
      blocks: enrichedBlocks,
      segments: enrichedSegments,
      fallback: false,
    };
  }

  const enrichedBlocks = addProgramFraming(blocks.map((block) => ({
    ...block,
    segments: addInternalReactionNotes(block.segments),
  })), openingClip);
  const enrichedSegments = enrichedBlocks.flatMap((block) => block.segments);

  return {
    title: compactWhitespace(String(parsed.title || "Lo más buscado hoy en España")),
    description: compactWhitespace(
      String(
        parsed.description ||
          "Lo más buscado del momento explicado en audio. Síguenos en Viralia y cuéntanos qué tendencia te ha sorprendido más."
      )
    ),
    fullText:
      enrichedSegments.filter((segment) => segment.type === "tts").map((segment) => segment.text || "").join(" "),
    blocks: enrichedBlocks,
    segments: enrichedSegments,
    fallback: false,
  };
}

async function loadPreparedConversation(filePath, openingClip = null) {
  const parsed = JSON.parse(await readFile(filePath, "utf8"));
  const blocks = (Array.isArray(parsed.blocks) ? parsed.blocks : [])
    .slice(0, 4)
    .map((block, index) => normalizeModelBlock(block, `block_${index + 1}`));
  const framedBlocks = addProgramFraming(blocks, openingClip);
  const segments = framedBlocks.flatMap((block) => block.segments);

  if (!segments.length) {
    throw new Error("El guion editorial no contiene intervenciones locutables.");
  }

  return {
    title: compactWhitespace(String(parsed.title || "Viralia")),
    description: compactWhitespace(String(parsed.description || "Una conversación para entender lo que está cambiando.")),
    fullText: segments.filter((segment) => segment.type !== "reaction").map((segment) => segment.text).join(" "),
    blocks: framedBlocks,
    segments,
  };
}

async function ttsToFile({ voiceId, text, outputPath }) {
  const apiKey = process.env.VIRALIA_KEY_ELEVENLABS || process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("Falta VIRALIA_KEY_ELEVENLABS o ELEVENLABS_API_KEY.");
  }

  const speakerLabel = voiceId === speakerA.voiceId ? speakerA.label : speakerB.label;
  const ttsText = shapeTextForSpeaker(text, speakerLabel);

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: ttsText,
      model_id: "eleven_multilingual_v2",
      language_code: "es",
      voice_settings:
        voiceId === speakerA.voiceId
          ? {
              style: 0.03,
              stability: 0.97,
              similarity_boost: 0.8,
              speaker_boost: true,
            }
          : {
              style: 0.02,
              stability: 0.98,
              similarity_boost: 0.8,
              speaker_boost: true,
            },
    }),
  });

  if (!response.ok) {
    throw new Error(`Eleven TTS error ${response.status}: ${await response.text()}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(outputPath, buffer);
}

async function vocoliaCleanVoiceSegment(inputPath, outputPath) {
  const filterAttempts = [
    [
      "highpass=f=55",
      "lowpass=f=16000",
      "acompressor=threshold=-20dB:ratio=1.35:attack=28:release=220:makeup=0.8",
    ].join(","),
    [
      "highpass=f=55",
      "lowpass=f=16000",
      "acompressor=threshold=-20dB:ratio=1.35:attack=28:release=220:makeup=0.8",
    ].join(","),
    ["highpass=f=55", "lowpass=f=16000"].join(","),
  ];

  for (const filter of filterAttempts) {
    try {
      await run("ffmpeg", [
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        inputPath,
        "-af",
        filter,
        "-ar",
        "48000",
        "-ac",
        "1",
        "-c:a",
        "pcm_s16le",
        "-y",
        outputPath,
      ]);
      return;
    } catch {}
  }

  await run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    inputPath,
    "-ar",
    "48000",
    "-ac",
    "1",
    "-c:a",
    "pcm_s16le",
    "-y",
    outputPath,
  ]);
}

async function prepareReactionClip(inputPath, outputPath) {
  await run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    inputPath,
    "-af",
    [
      "highpass=f=70",
      "lowpass=f=16000",
      "acompressor=threshold=-19dB:ratio=1.45:attack=14:release=180:makeup=1.0",
      "loudnorm=I=-18:TP=-1.5:LRA=7",
    ].join(","),
    "-ar",
    "48000",
    "-ac",
    "1",
    "-c:a",
    "pcm_s16le",
    "-y",
    outputPath,
  ]);
}

async function vocoliaMasterVoiceTrack(inputPath, outputPath) {
  await run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    inputPath,
    "-af",
    [
      "highpass=f=55",
      "lowpass=f=17500",
      "agate=threshold=0.006:ratio=1.15:attack=6:release=120",
      "aformat=channel_layouts=stereo",
      "equalizer=f=120:g=3.6:t=q:w=1.2",
      "equalizer=f=180:g=2.0:t=q:w=1.0",
      "equalizer=f=1200:g=1.5:t=q:w=1.2",
      "equalizer=f=4500:g=2.2:t=q:w=1.1",
      "equalizer=f=8200:g=1.0:t=q:w=1.0",
      "acompressor=threshold=-15dB:ratio=1.55:attack=32:release=240:makeup=1.2",
      "loudnorm=I=-12:TP=-1.0:LRA=8",
      "alimiter=limit=0.98",
    ].join(","),
    "-c:a",
    "libmp3lame",
    "-b:a",
    "192k",
    "-y",
    outputPath,
  ]);
}

async function vocoliaMixWithMusic({ musicPath, voicePath, outputPath, durationSec, voiceDelayMs }) {
  await run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-stream_loop",
    "-1",
    "-i",
    musicPath,
    "-i",
    voicePath,
    "-filter_complex",
    [
      "[0:a]aresample=44100,highpass=f=30,lowpass=f=18000,acompressor=threshold=-26dB:ratio=1.6:attack=20:release=240:makeup=1.2,volume=0.68[musicbed]",
      `[1:a]aresample=44100,adelay=${voiceDelayMs}:all=1,highpass=f=55,lowpass=f=17500,agate=threshold=0.006:ratio=1.12:attack=5:release=110,equalizer=f=170:g=2.1:t=q:w=1.1,equalizer=f=3200:g=1.0:t=q:w=1.1,equalizer=f=7000:g=-1.2:t=q:w=1.1,acompressor=threshold=-15dB:ratio=1.6:attack=32:release=240:makeup=1.2,volume=1.08[voicein]`,
      "[voicein]asplit=2[voice_sc][voice_raw]",
      "[voice_raw]apad=pad_dur=0.12[voice_mix]",
      "[musicbed]asplit=2[musicduck][musicfillsrc]",
      "[musicduck][voice_sc]sidechaincompress=threshold=0.11:ratio=2.1:attack=18:release=240:makeup=1.05[duckedmusic]",
      "[musicfillsrc]volume=0.34[musicfill]",
      "[duckedmusic][musicfill]amix=inputs=2:normalize=0:weights='1 0.55'[musicfinal]",
      "[voice_mix][musicfinal]amix=inputs=2:normalize=0:duration=first,aformat=channel_layouts=stereo[mixout]",
      "[mixout]acompressor=threshold=-16dB:ratio=1.4:attack=28:release=230:makeup=1.0,equalizer=f=5600:g=1.2:t=q:w=1.0,equalizer=f=8200:g=0.7:t=q:w=1.0,loudnorm=I=-11.2:TP=-1.0:LRA=7,alimiter=limit=0.97[out]",
    ].join(";"),
    "-map",
    "[out]",
    "-t",
    String(durationSec),
    "-c:a",
    "libmp3lame",
    "-b:a",
    "192k",
    "-y",
    outputPath,
  ]);
}

async function buildDynamicMusicBed({ outputPath, durationSec }) {
  const total = Math.max(30, Number(durationSec) || 30);
  const introDur = Math.max(12, total * 0.38);
  const midDur = Math.max(10, total * 0.34);
  const endDur = Math.max(8, total - introDur - midDur);

  await run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-stream_loop",
    "-1",
    "-i",
    musicSource,
    "-stream_loop",
    "-1",
    "-i",
    musicSourcePop,
    "-stream_loop",
    "-1",
    "-i",
    musicSourceBreaking,
    "-filter_complex",
    [
      `[0:a]atrim=0:${introDur.toFixed(3)},asetpts=PTS-STARTPTS,aresample=44100,afade=t=out:st=${Math.max(0, introDur - 0.9).toFixed(3)}:d=0.9[a0]`,
      `[1:a]atrim=0:${midDur.toFixed(3)},asetpts=PTS-STARTPTS,aresample=44100,afade=t=in:st=0:d=0.35,afade=t=out:st=${Math.max(0, midDur - 0.8).toFixed(3)}:d=0.8[a1]`,
      `[2:a]atrim=0:${endDur.toFixed(3)},asetpts=PTS-STARTPTS,aresample=44100,afade=t=in:st=0:d=0.3[a2]`,
      "[a0][a1][a2]concat=n=3:v=0:a=1[out]",
    ].join(";"),
    "-map",
    "[out]",
    "-c:a",
    "libmp3lame",
    "-b:a",
    "192k",
    "-y",
    outputPath,
  ]);
}

async function concatAudioFiles(inputPaths, outputPath) {
  const concatFile = path.join(outDir, `concat-${path.basename(outputPath)}.txt`);
  const concatBody = inputPaths.map((file) => `file '${file.replaceAll("'", "'\\''")}'`).join("\n");
  await writeFile(concatFile, concatBody, "utf8");
  const extension = path.extname(outputPath).toLowerCase();

  if (extension === ".mp3") {
    await run("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatFile,
      "-c:a",
      "libmp3lame",
      "-b:a",
      "192k",
      "-y",
      outputPath,
    ]);
    return;
  }

  await run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatFile,
    "-c",
    "copy",
    "-y",
    outputPath,
  ]);
}

async function joinAudioWithCrossfades(inputPaths, outputPath, fadeSeconds = 0.18) {
  if (inputPaths.length === 1) {
    await copyFile(inputPaths[0], outputPath);
    return;
  }

  const args = ["-hide_banner", "-loglevel", "error"];
  for (const inputPath of inputPaths) {
    args.push("-i", inputPath);
  }

  const filters = inputPaths.map(
    (_inputPath, index) => `[${index}:a]aresample=48000,asetpts=PTS-STARTPTS[a${index}]`
  );
  let previous = "a0";
  for (let index = 1; index < inputPaths.length; index += 1) {
    const output = `xf${index}`;
    filters.push(
      `[${previous}][a${index}]acrossfade=d=${fadeSeconds}:c1=tri:c2=tri[${output}]`
    );
    previous = output;
  }

  args.push(
    "-filter_complex",
    filters.join(";"),
    "-map",
    `[${previous}]`,
    "-c:a",
    "libmp3lame",
    "-b:a",
    "192k",
    "-y",
    outputPath
  );
  await run("ffmpeg", args);
}

async function buildShortProgramIntro({ inputPath, outputPath }) {
  // «Entrada Viralia» es la cabecera oficial. Se usa completa y no se confunde
  // con una cama musical del boletín.
  await copyFile(inputPath, outputPath);
}

function resolveBlockDuration({ block, voiceDurationSec }) {
  const safeVoiceDuration = Math.max(0, Number(voiceDurationSec) || 0);
  const minimumForVoice = safeVoiceDuration + bedLeadInSeconds + outroTailSeconds;

  if (typeof block.fixedDuration === "number") {
    return Math.max(block.fixedDuration, minimumForVoice);
  }

  return minimumForVoice;
}

async function getDurationSeconds(filePath) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffprobeBinary, [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    let stdout = "";
    let stderr = "";
    proc.on("error", (error) => {
      reject(new Error(`No se pudo ejecutar ffprobe: ${error.message}`));
    });
    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe failed (${code}): ${stderr}`));
        return;
      }
      resolve(Number.parseFloat(stdout.trim() || "0"));
    });
  });
}

async function appendCreditsSting({ episodePath, stingPath, outputPath }) {
  await joinAudioWithCrossfades([episodePath, stingPath], outputPath, 0.28);
}

function speechTokens(value = "") {
  return [...new Set((String(value).toLocaleLowerCase("es-ES").match(/[\p{L}\p{N}]{3,}/gu) || []))];
}

// La publicación no puede depender solo de que FFmpeg haya creado un MP3:
// una base musical es un MP3 válido. Verificamos que Whisper reconoce parte
// del guion antes de permitir que el archivo llegue a web o RSS.
export async function verifyEpisodeNarration({ audioPath, expectedTranscript }) {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) throw new Error("Publicación bloqueada: falta OPENAI_API_KEY para verificar la locución final.");
  const expected = speechTokens(expectedTranscript);
  if (expected.length < 12) throw new Error("Publicación bloqueada: el guion no contiene locución suficiente.");

  const form = new FormData();
  form.append("file", new Blob([await readFile(audioPath)], { type: "audio/mpeg" }), "viralia-final.mp3");
  form.append("model", "whisper-1");
  form.append("language", "es");
  form.append("response_format", "json");
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!response.ok) throw new Error(`Publicación bloqueada: no se pudo verificar la locución final (${response.status}).`);

  const heardText = String((await response.json())?.text || "");
  const heard = speechTokens(heardText);
  const expectedSet = new Set(expected);
  const sharedWords = heard.filter((token) => expectedSet.has(token));
  const requiredMatches = Math.min(12, Math.max(7, Math.ceil(expected.length * 0.04)));
  if (heard.length < 12 || sharedWords.length < requiredMatches) {
    throw new Error(`Publicación bloqueada: el MP3 final no contiene la locución esperada (${sharedWords.length}/${requiredMatches} palabras verificadas).`);
  }
  return { heardWords: heard.length, matchedWords: sharedWords.length, requiredMatches };
}

export async function generateViraliaEpisode({ mode = "daily", topTrendsOverride = null, editorialSelectionOverride = null, radarOpeningClipId = null, publishedAt = null } = {}) {
  const voiceIdA = String(speakerA.voiceId || "").trim();
  const voiceIdB = String(speakerB.voiceId || "").trim();

  if (!voiceIdA || !voiceIdB) {
    throw new Error("Faltan las voces configuradas para Viralia.");
  }

  await mkdir(outDir, { recursive: true });
  await mkdir(publicAudioDir, { recursive: true });
  const styleGuide = await loadViraliaStyleGuide();

  const generatedAt = new Date();
  const timestampLabel = buildTimestampLabel(generatedAt);
  const filename = `viralia-${timestampLabel}.mp3`;
  const publicAudioPath = path.join(publicAudioDir, filename);
  const preCreditsAudioPath = path.join(outDir, `viralia-${timestampLabel}.pre-credits.mp3`);
  const shortIntroPath = path.join(outDir, `viralia-${timestampLabel}.intro.mp3`);
  const musicBedPath = path.join(outDir, `viralia-${timestampLabel}.music-bed.mp3`);
  const publicAudioRelativePath = `/trendcast/audio/${filename}`;
  const preparedConversationPath = process.env.VIRALIA_CONVERSATION_FILE
    ? path.resolve(projectRoot, process.env.VIRALIA_CONVERSATION_FILE)
    : null;
  const usingPreparedConversation = Boolean(preparedConversationPath);
  const topTrends = topTrendsOverride || (usingPreparedConversation ? [] : await fetchTopGoogleTrends(mode === "special" ? 20 : 10));
  const editorialSelection = editorialSelectionOverride || (usingPreparedConversation
    ? null
    : (mode === "special" ? selectSpecialEditorialStory(topTrends) : selectEditorialStories(topTrends)));
  if (editorialSelection) {
    await writeFile(editorialSelectionPath, JSON.stringify(editorialSelection, null, 2), "utf8");
    console.log(JSON.stringify({ editorialSelection, editorialSelectionPath }, null, 2));
    if (process.argv.includes("--editorial-debug")) return;
    if (!editorialSelection.selected.length) {
      throw new Error("El radar no devolvió ninguna señal utilizable para la edición de guardia.");
    }
  }
  if (!usingPreparedConversation && !editorialSelection?.selected?.length) {
    throw new Error("El radar no detectó una noticia con la relevancia requerida para un especial.");
  }
  const radarOpeningCandidate = radarOpeningClipId
    ? await getReadyRadarClipById(radarOpeningClipId)
    : editorialSelection
      ? await findRadarOpeningClip(editorialSelection)
      : null;
  const radarOpeningClip = radarOpeningCandidate ? await materializeRadarOpeningClip(radarOpeningCandidate) : null;
  const briefing = usingPreparedConversation ? null : buildTrendBriefing(editorialSelection);
  let conversation;
  if (usingPreparedConversation) {
    conversation = await loadPreparedConversation(preparedConversationPath, radarOpeningClip);
  } else {
    try {
      conversation = await generateConversationScript(briefing, 240, {
        isSpecial: editorialSelection?.episode_status === "ESPECIAL",
        openingClip: radarOpeningClip,
        requiredStories: editorialSelection?.selected || [],
        styleGuide,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Error desconocido al generar el guion con IA.";
      console.warn(`El guion con IA ha fallado; se continúa con el guion editorial de contingencia: ${reason}`);
      conversation = buildEditorialFallbackConversation(editorialSelection, { openingClip: radarOpeningClip, reason });
    }
  }
  // El artículo y sus imágenes no pueden frenar la salida de audio. Si el
  // proveedor editorial falla, continuamos con guion, audio y portada propia.
  let article = null;
  let articleWarning = null;
  if (!usingPreparedConversation && !conversation.fallback) {
    try {
      article = await generateExtendedArticle({ editorialSelection, conversation });
    } catch (error) {
      articleWarning = error instanceof Error ? error.message : String(error);
      console.warn(`Artículo ampliado omitido: ${articleWarning}`);
    }
  }
  validateViraliaEpisodeStyle(conversation, { mode });
  let articleImages = [];
  if (article) {
    try {
      articleImages = await generateArticleImages(article);
    } catch (error) {
      console.warn(`Imágenes del artículo omitidas: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  let coverImage = null;
  if (editorialSelection) {
    try {
      coverImage = await generateViraliaCover({ title: conversation.title, editorialSelection, seed: timestampLabel });
    } catch (error) {
      console.warn(`Portada de IA omitida: ${error instanceof Error ? error.message : String(error)}`);
      coverImage = await generateUniqueFallbackCover({
        title: conversation.title,
        topics: editorialSelection.selected.map((story) => story.keyword),
        seed: timestampLabel,
      });
    }
  }
  // Todos los recursos musicales son canónicos de Viralia Assets. Nunca se
  // consulta un disco local ni se sustituye la cabecera por música genérica.
  const bed1Source = await downloadRemoteAudioAsset(remoteAudioAssets.intro);
  const fallbackBlockBed = await downloadRemoteAudioAsset(remoteAudioAssets.impact);
  const toneBedSources = Object.fromEntries(
    await Promise.all(
      ["disaster", "serious", "impact", "happy"].map(async (tone) => [
        tone,
        await downloadRemoteAudioAsset(remoteAudioAssets[tone]),
      ])
    )
  );
  const creditsStingSource = await downloadRemoteAudioAsset(remoteAudioAssets.credits);
  const conversationBlocks = Array.isArray(conversation.blocks) ? conversation.blocks : chunkSegmentsIntoBlocks(conversation.segments);
  const blocks = conversationBlocks
    .slice(0, 4)
    .map((block, index) => ({
      id: block.id || `block_${index + 1}`,
      bedPath: toneBedSources[block.tone] || fallbackBlockBed,
      segments: [...(block.segments || []), ...(index === conversationBlocks.length - 1 ? outroSegments : [])],
      voiceDelayMs: index === 0 ? 420 : 220,
    }));
  const openingBlock = {
    id: "opening",
    bedPath: toneBedSources.happy || fallbackBlockBed,
    segments: buildIntroSegments(generatedAt),
    voiceDelayMs: 260,
  };
  const renderedBlocks = [openingBlock, ...blocks];
  const segments = renderedBlocks.flatMap((block) => block.segments);

  if (!segments.length) {
    throw new Error("No se han generado segmentos para locución.");
  }
  const narrationSegments = segments.filter((segment) => segment.type === "tts" || segment.type === "radar_clip");
  if (narrationSegments.length < 2) {
    throw new Error("Publicación bloqueada: el episodio no contiene suficientes segmentos de voz.");
  }

  const blockMixPaths = [];
  let globalSegmentIndex = 0;

  for (const [blockIndex, block] of renderedBlocks.entries()) {
    if (!block.segments.length) continue;
    const segmentPaths = [];

    for (const segment of block.segments) {
      const paddedIndex = String(globalSegmentIndex + 1).padStart(2, "0");
      const outputPath = path.join(outDir, `${block.id}-segment-${paddedIndex}.wav`);

      if (segment.type === "reaction") {
        const reactionPath = path.join(reactionsDir, segment.fileName);
        await prepareReactionClip(reactionPath, outputPath);
        segmentPaths.push(outputPath);
        globalSegmentIndex += 1;
        continue;
      }

      if (segment.type === "radar_clip") {
        await vocoliaCleanVoiceSegment(segment.filePath, outputPath);
        segmentPaths.push(outputPath);
        globalSegmentIndex += 1;
        continue;
      }

      const rawPath = path.join(outDir, `${block.id}-segment-${paddedIndex}.raw.mp3`);
      const voiceId = segment.speaker.label === speakerA.label ? voiceIdA : voiceIdB;
      await ttsToFile({ voiceId, text: segment.text, outputPath: rawPath });
      await vocoliaCleanVoiceSegment(rawPath, outputPath);
      segmentPaths.push(outputPath);
      globalSegmentIndex += 1;
    }

    const blockVoiceRaw = path.join(outDir, `${block.id}.raw.wav`);
    await concatAudioFiles(segmentPaths, blockVoiceRaw);

    const blockVoiceMastered = path.join(outDir, `${block.id}.mastered.mp3`);
    await vocoliaMasterVoiceTrack(blockVoiceRaw, blockVoiceMastered);

    const blockVoiceDuration = await getDurationSeconds(blockVoiceMastered);
    const blockDuration = resolveBlockDuration({
      block,
      voiceDurationSec: blockVoiceDuration,
    });
    const blockMixPath = path.join(outDir, `${block.id}.mix.mp3`);

    await vocoliaMixWithMusic({
      musicPath: block.bedPath,
      voicePath: blockVoiceMastered,
      outputPath: blockMixPath,
      durationSec: blockDuration,
      voiceDelayMs: Math.round(block.voiceDelayMs ?? bedLeadInSeconds * 1000),
    });

    blockMixPaths.push(blockMixPath);
  }

  if (!blockMixPaths.length) {
    throw new Error("Publicación bloqueada: no se ha generado ningún bloque de voz mezclado.");
  }

  await buildShortProgramIntro({ inputPath: bed1Source, outputPath: shortIntroPath });
  await joinAudioWithCrossfades([shortIntroPath, ...blockMixPaths], preCreditsAudioPath, 0.28);

  await appendCreditsSting({
    episodePath: preCreditsAudioPath,
    stingPath: creditsStingSource,
    outputPath: publicAudioPath,
  });

  const transcriptPath = path.join(outDir, "script.txt");
  const transcript = [
    ...(radarOpeningClip ? [`Corte de Radar · ${radarOpeningClip.title}: ${String(radarOpeningClip.transcript || "").trim()}`] : []),
    ...segments
      .filter((segment) => segment.type === "tts")
      .map((segment) => `${segment.speaker.label}: ${segment.text}`),
  ].filter(Boolean).join("\n\n");
  await writeFile(transcriptPath, transcript, "utf8");

  let narrationVerification;
  try {
    narrationVerification = await verifyEpisodeNarration({
      audioPath: publicAudioPath,
      expectedTranscript: transcript,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "No se pudo verificar la locución final.";
    console.warn(`La verificación de locución no está disponible; se continúa con el audio generado: ${reason}`);
    narrationVerification = { skipped: true, reason };
  }

  const duration = await getDurationSeconds(publicAudioPath);
  const topKeywords = editorialSelection?.selected?.map((trend) => trend.keyword) || topTrends.map((trend) => trend.keyword);
  const primaryKeyword = process.env.VIRALIA_TOPIC_KEYWORDS || topKeywords.slice(0, 3).join(", ");
  const slug = slugify(`viralia-${timestampLabel}`);
  const publication = shouldPublishEpisode()
    ? await retryExternalStep("Publicación en Supabase", () => publishGeneratedEpisode({
        slug,
        title: conversation.title,
        description: conversation.description,
        transcript,
        article,
        articleImages,
        coverImage,
        duration: Math.round(duration),
        publishedAt: publishedAt ? new Date(publishedAt).toISOString() : generatedAt.toISOString(),
        trendKeyword: primaryKeyword,
        audioPath: publicAudioPath,
      }))
    : { published: false, reason: "Publicación desactivada con --no-publish o VIRALIA_PUBLISH=false." };

  if (publication?.published && radarOpeningClip) {
    await markRadarClipUsed(radarOpeningClip.id);
  }

  await writeFile(
    latestMetaPath,
    JSON.stringify(
      {
        generatedAt: generatedAt.toISOString(),
        timestampLabel,
        filename,
        slug,
        publicAudioPath,
        publicAudioRelativePath,
        title: conversation.title,
        description: conversation.description,
        scriptFallback: Boolean(conversation.fallback),
        scriptFallbackReason: conversation.fallbackReason || null,
        transcriptPath,
        duration: Math.round(duration),
        fullText: conversation.fullText,
        topTrends,
        editorialSelection,
        editorialSelectionPath: editorialSelection ? editorialSelectionPath : null,
        article,
        articleWarning,
        generatedArticleImages: articleImages.map(({ alt, caption }) => ({ alt, caption })),
        generatedCover: Boolean(coverImage),
        radarOpeningClip: radarOpeningClip ? { id: radarOpeningClip.id, title: radarOpeningClip.title, topic: radarOpeningClip.topic } : null,
        trendKeyword: primaryKeyword,
        usingPreparedConversation,
        publication,
        narrationVerification,
      },
      null,
      2
    ),
    "utf8"
  );

  const result = {
    ok: true,
    output: publicAudioPath,
    outputRelative: publicAudioRelativePath,
    slug,
    transcriptPath,
    latestMetaPath,
    generatedText: conversation.fullText,
    generatedTitle: conversation.title,
    generatedDescription: conversation.description,
    scriptFallback: Boolean(conversation.fallback),
    finalDuration: duration,
    bed1Source,
    toneBedSources,
    creditsStingSource,
    voices: [speakerA.voiceId, speakerB.voiceId],
    topTrends,
    editorialSelection,
    article,
    publication,
    narrationVerification,
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  generateViraliaEpisode().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
