import { mkdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";
import { getSupabaseAdminClient } from "../database/server";
import { getSiteUrl, toAbsoluteUrl } from "../site";

const EPISODES_PATH = path.join(process.cwd(), "trendcast", "data", "episodes.local.json");
const TRENDS_PATH = path.join(
  process.cwd(),
  "trend-radar",
  "reports",
  "latest-trend-radar.json"
);
const PUBLIC_AUDIO_DIR = path.join(process.cwd(), "public", "trendcast", "audio");
const PUBLIC_UPLOADS_DIR = path.join(process.cwd(), "public", "trendcast", "uploads");
const DEFAULT_COVER = "/trendcast/viralia-cover.png";
const DEFAULT_AUDIO = "/trendcast/audio/demo-queso.mp3";
const TRENDS_RSS_URL = "https://trends.google.com/trending/rss?geo=ES";

export const PODCAST_CONFIG = {
  name: "Viralia",
  alternateNames: ["TrendCast", "TenCast", "Tend Podcast"],
  shortDescription:
    "Las búsquedas más locas y comentadas de internet explicadas en audio.",
  description:
    "Viralia convierte señales reales de Google Trends en microepisodios de audio con mirada editorial, estética media lab y cultura de internet.",
  seoDescription:
    "Podcast de tendencias virales, Google Trends España, búsquedas en tiempo real y cultura de internet explicada en audio.",
  email: "info@localreset.com",
  language: "es-ES",
  category: "Technology",
  subcategory: "News Commentary",
  explicit: "false",
  author: "Local Reset",
  owner: "Local Reset",
  keywords: [
    "podcast tendencias",
    "tendencias virales",
    "google trends españa",
    "podcast actualidad",
    "podcast cultura de internet",
    "podcast marketing",
    "podcast seo",
    "local reset",
  ],
};

const demoEpisode = {
  id: "demo-queso",
  title: "¿Por qué todo el mundo busca queso hoy?",
  slug: "queso",
  description:
    "Episodio demo de Viralia sobre el pico de búsquedas de queso: recetas virales, conversación social y señales culturales desde España y Madrid.",
  audio_url: DEFAULT_AUDIO,
  cover_url: DEFAULT_COVER,
  duration: 53,
  published_at: "2026-05-22T09:00:00.000Z",
  trend_keyword: "queso",
  transcript:
    "Host A: Bienvenidos a Viralia.\n\nHost B: Lo que busca la gente en Google y lo que pregunta en ChatGPT, explicado en audio.\n\nHost A: Hoy vamos a hablar de algo que está arrasando en las búsquedas: el queso. ¿Por qué crees que la gente está tan interesada en esto?\n\nHost B: Parece que el queso se ha vuelto un tema candente. La gente busca recetas en Google, como tablas de quesos para cenas y eventos. Además, ChatGPT está recibiendo preguntas sobre maridajes y cómo hacer queso en casa.\n\nHost A: ¿Y esto tiene que ver con las redes sociales?\n\nHost B: Totalmente. TikTok y Reels están llenos de contenido visual sobre comidas. La gente quiere impresionar en sus cenas. Y eso abre oportunidades para marcas gourmet y supermercados.\n\nHost A: Así que el queso no solo es un alimento, es una tendencia.\n\nHost B: Exacto. Y con el auge de la cultura foodie, esto seguirá creciendo.\n\nHost A: Esto ha sido Viralia.\n\nHost B: Nos escuchamos en el próximo episodio.",
};

function slugify(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeXml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function stripHtml(value = "") {
  return String(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function splitTrendKeywords(value = "") {
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function compactWhitespace(text = "") {
  return String(text).replace(/\s+/g, " ").trim();
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

    return {
      id: `${slugify(keyword || `trend-${index + 1}`)}-${index}`,
      keyword,
      approxTraffic,
      growthScore: parseTrafficScore(approxTraffic),
      momentum: "live",
      category: sources[0] || "Google Trends Espana",
      regions: ["Espana"],
      relatedSearches: newsTitles,
    };
  });
}

async function fetchRealtimeTrendSignals() {
  const response = await fetch(TRENDS_RSS_URL, { next: { revalidate: 900 } });
  if (!response.ok) {
    throw new Error(`Google Trends RSS error ${response.status}`);
  }

  const xml = await response.text();
  return parseGoogleTrendsRss(xml).filter((trend) => trend.keyword).slice(0, 10);
}

function normalizeTranscriptParagraphs(transcript = "") {
  return String(transcript)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function buildEpisodeSeoDescription(row = {}) {
  const keywords = splitTrendKeywords(row.trend_keyword).slice(0, 3);
  const keywordText = keywords.length ? ` Temas del episodio: ${keywords.join(", ")}.` : "";
  return `${row.description || demoEpisode.description}${keywordText} Episodio de Viralia sobre tendencias de búsqueda, actualidad viral y cultura de internet en España.`;
}

function buildEpisodeSummaryHtml(episode) {
  const keywords = splitTrendKeywords(episode.trend_keyword);
  const intro = `<p>${escapeXml(episode.description)}</p>`;
  const keywordBlock = keywords.length
    ? `<p><strong>Temas clave:</strong> ${escapeXml(keywords.join(", "))}.</p>`
    : "";

  return `${intro}${keywordBlock}`;
}

async function getEnclosureLength(audioUrl = "") {
  try {
    if (audioUrl.startsWith("/")) {
      const localPath = path.join(process.cwd(), "public", audioUrl);
      const info = await stat(localPath);
      return info.size;
    }
  } catch {
    return 0;
  }

  if (!audioUrl.startsWith("http://") && !audioUrl.startsWith("https://")) {
    return 0;
  }

  try {
    const response = await fetch(audioUrl, { method: "HEAD" });
    const contentLength = Number.parseInt(response.headers.get("content-length") || "0", 10);
    return Number.isFinite(contentLength) ? contentLength : 0;
  } catch {
    return 0;
  }
}

export function formatEpisodeDate(dateInput) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(new Date(dateInput));
}

export function getEpisodeKeywords(episode = {}) {
  return [...new Set([...splitTrendKeywords(episode.trend_keyword), ...PODCAST_CONFIG.keywords])];
}

export function getEpisodeTranscriptParagraphs(episode = {}) {
  return normalizeTranscriptParagraphs(episode.transcript);
}

export function buildEpisodeIntro(episode = {}) {
  const keywords = splitTrendKeywords(episode.trend_keyword).slice(0, 3);
  const keywordText = keywords.length ? keywords.join(", ") : "tendencias virales";
  return `Escucha este episodio de Viralia sobre ${keywordText}, con contexto rápido para entender por qué estas búsquedas están subiendo hoy en España.`;
}

export function getEpisodeArticle(episode = {}) {
  const article = episode.article_body;
  if (!article || typeof article !== "object") return null;
  const sections = Array.isArray(article.sections)
    ? article.sections
        .map((section) => ({
          heading: compactWhitespace(section?.heading),
          paragraphs: (Array.isArray(section?.paragraphs) ? section.paragraphs : [])
            .map(compactWhitespace)
            .filter(Boolean),
        }))
        .filter((section) => section.heading && section.paragraphs.length)
    : [];
  if (!compactWhitespace(article.intro) || !sections.length) return null;
  return {
    intro: compactWhitespace(article.intro),
    sections,
    images: Array.isArray(episode.article_images) ? episode.article_images.filter((image) => image?.url) : [],
  };
}

export function buildEpisodeFaqs(episode = {}) {
  const keywords = splitTrendKeywords(episode.trend_keyword).slice(0, 3);
  const firstTopic = keywords[0] || "esta tendencia";
  return [
    {
      question: `¿De qué va este episodio sobre ${firstTopic}?`,
      answer: `${episode.description} Viralia resume el contexto de la tendencia y explica por qué se está buscando ahora mismo.`,
    },
    {
      question: "¿Qué tipo de tendencias analiza Viralia?",
      answer:
        "Viralia analiza búsquedas virales, temas de actualidad, cultura de internet, entretenimiento, deporte y señales que están creciendo en Google Trends España.",
    },
    {
      question: "¿Dónde puedo escuchar el episodio completo?",
      answer:
        "Puedes escucharlo desde la propia página del episodio, desde el feed RSS de Viralia y desde las plataformas de podcast que lean ese feed.",
    },
  ];
}

function buildFeedKeywords(episode) {
  return getEpisodeKeywords(episode).slice(0, 12).join(", ");
}

function buildFeedItemTitle(episode) {
  const keywords = splitTrendKeywords(episode.trend_keyword).slice(0, 2);
  return keywords.length ? `${episode.title} | ${keywords.join(" y ")}` : episode.title;
}

function buildFeedChannelDescription() {
  return `${PODCAST_CONFIG.description} ${PODCAST_CONFIG.seoDescription}`;
}

function normalizeEpisode(row = {}) {
  const slug = row.slug || slugify(row.title || demoEpisode.title);
  const durationSeconds =
    typeof row.duration === "number" ? row.duration : Number.parseInt(row.duration, 10) || 0;

  return {
    id: row.id || slug,
    title: row.title || demoEpisode.title,
    slug,
    description: row.description || demoEpisode.description,
    audio_url: row.audio_url || DEFAULT_AUDIO,
    cover_url: row.cover_url || DEFAULT_COVER,
    duration: durationSeconds || demoEpisode.duration,
    published_at: row.published_at || demoEpisode.published_at,
    trend_keyword: row.trend_keyword || demoEpisode.trend_keyword,
    transcript: row.transcript || demoEpisode.transcript,
    article_body: row.article_body && typeof row.article_body === "object" ? row.article_body : null,
    article_images: Array.isArray(row.article_images) ? row.article_images : [],
    seoTitle:
      row.seo_title ||
      `${row.title || demoEpisode.title} | Podcast de tendencias virales y búsquedas en España`,
    seoDescription:
      row.seo_description ||
      buildEpisodeSeoDescription({
        description: row.description || demoEpisode.description,
        trend_keyword: row.trend_keyword || demoEpisode.trend_keyword,
      }),
    audioUrlAbsolute: toAbsoluteUrl(row.audio_url || DEFAULT_AUDIO),
    coverUrlAbsolute: toAbsoluteUrl(row.cover_url || DEFAULT_COVER),
    episodeUrlAbsolute: toAbsoluteUrl(`/viralia/${slug}`),
  };
}

async function readLocalEpisodes() {
  try {
    const raw = await readFile(EPISODES_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) {
      return [demoEpisode];
    }
    return parsed;
  } catch {
    return [demoEpisode];
  }
}

async function writeLocalEpisodes(episodes) {
  await mkdir(path.dirname(EPISODES_PATH), { recursive: true });
  await writeFile(EPISODES_PATH, JSON.stringify(episodes, null, 2), "utf8");
}

async function fetchSupabaseEpisodes({ includeScheduled = false } = {}) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  let query = supabase.from("trendcast_episodes").select("*").order("published_at", { ascending: false });
  if (!includeScheduled) query = query.lte("published_at", new Date().toISOString());
  const { data, error } = await query;

  if (error) {
    return null;
  }

  return data || [];
}

export async function getEpisodes({ includeScheduled = false } = {}) {
  const [remoteEpisodes, localEpisodes] = await Promise.all([fetchSupabaseEpisodes({ includeScheduled }), readLocalEpisodes()]);
  const mergedEpisodes = [...(remoteEpisodes || []), ...(localEpisodes || [])];
  const dedupedEpisodes = Array.from(
    new Map(
      mergedEpisodes.map((episode) => [
        episode.slug || slugify(episode.title || ""),
        episode,
      ])
    ).values()
  );

  return dedupedEpisodes
    .map(normalizeEpisode)
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
}

export async function getEpisodeBySlug(slug) {
  const episodes = await getEpisodes();
  return episodes.find((episode) => episode.slug === slug) || null;
}

export async function getLatestEpisode() {
  const episodes = await getEpisodes();
  return episodes[0] || normalizeEpisode(demoEpisode);
}

export async function getTrendSignals() {
  try {
    const realtimeTrends = await fetchRealtimeTrendSignals();
    if (realtimeTrends.length) {
      return realtimeTrends;
    }
  } catch {}

  try {
    const raw = await readFile(TRENDS_PATH, "utf8");
    const parsed = JSON.parse(raw);
    const trends = Array.isArray(parsed?.trends) ? parsed.trends : [];

    if (trends.length) {
      return trends.slice(0, 10).map((trend, index) => ({
        id: `${trend.keyword}-${index}`,
        keyword: trend.keyword,
        growthScore: trend.growthScore ?? 0,
        momentum: trend.momentum || "rising",
        category: trend.category || "Tendencia digital",
        regions: trend.regions || [],
        relatedSearches: trend.relatedSearches || [],
      }));
    }
  } catch {}

  return [
    {
      id: "queso",
      keyword: "queso",
      growthScore: 88,
      momentum: "rising",
      category: "Google Trends Espana",
      regions: ["Espana"],
      relatedSearches: ["receta queso viral", "tabla de quesos", "queso moda tiktok"],
    },
  ];
}

export function formatTrendTraffic(value = 0) {
  const score = Number(value) || 0;
  if (!score) {
    return "sin dato";
  }
  if (score >= 1000) {
    return `${Math.round(score / 1000)}K+`;
  }
  return `${score}+`;
}

export function buildTrendChartPoints(trends = []) {
  const maxScore = Math.max(...trends.map((trend) => Number(trend.growthScore) || 0), 1);
  return trends.map((trend, index) => ({
    ...trend,
    chartValue: Math.max(14, Math.round(((Number(trend.growthScore) || 0) / maxScore) * 100)),
    rank: index + 1,
    shortLabel: compactWhitespace(trend.keyword).slice(0, 18),
  }));
}

async function fetchRedditFeed(subreddit) {
  const response = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=3`, {
    headers: {
      "User-Agent": "LocalResetTrendcast/1.0",
    },
    next: { revalidate: 900 },
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
    .map((post) => ({
      title: compactWhitespace(post.title || ""),
      meta: `${subreddit} · ${Number(post.ups || 0)} upvotes`,
    }));
}

async function fetchHackerNewsSignals() {
  const response = await fetch(
    "https://hn.algolia.com/api/v1/search_by_date?query=AI&tags=story&hitsPerPage=3",
    { next: { revalidate: 900 } }
  );

  if (!response.ok) {
    throw new Error(`Hacker News error ${response.status}`);
  }

  const data = await response.json();
  const hits = Array.isArray(data?.hits) ? data.hits : [];
  return hits.slice(0, 3).map((hit) => ({
    title: compactWhitespace(hit.title || hit.story_title || "Hacker News AI thread"),
    meta: `HN · ${Number(hit.points || 0)} puntos`,
  }));
}

export async function getTrendSourcePanels() {
  const trends = await getTrendSignals();
  const panels = [];

  panels.push({
    id: "google-trends",
    title: "Google Trends",
    status: "live",
    description:
      'Imprescindible para detectar qué búsquedas sobre Alexa, IA y palabras más buscadas suben de golpe en España.',
    items: trends.slice(0, 3).map((trend) => ({
      title: trend.keyword,
      meta: `${formatTrendTraffic(trend.growthScore)} · ${trend.category}`,
    })),
  });

  try {
    const [artificial, alexa] = await Promise.all([
      fetchRedditFeed("artificial"),
      fetchRedditFeed("alexa"),
    ]);

    panels.push({
      id: "reddit",
      title: "Reddit",
      status: "live",
      description:
        "Comunidades como r/artificial y r/alexa muestran qué problemas, novedades y usos se comentan ya entre usuarios.",
      items: [...artificial.slice(0, 2), ...alexa.slice(0, 1)],
    });
  } catch {
    panels.push({
      id: "reddit",
      title: "Reddit",
      status: "watch",
      description:
        "Seguimiento de r/artificial y r/alexa para detectar debates, fallos y preguntas recurrentes.",
      items: [],
    });
  }

  try {
    const hackerNewsItems = await fetchHackerNewsSignals();
    panels.push({
      id: "hacker-news",
      title: "Hacker News",
      status: "live",
      description:
        "Radar útil para ver qué herramientas, papers y noticias de IA están moviendo a ingenieros y builders.",
      items: hackerNewsItems,
    });
  } catch {
    panels.push({
      id: "hacker-news",
      title: "Hacker News",
      status: "watch",
      description:
        "Fuente para seguir qué desarrollos y noticias de IA están siendo más discutidos por perfiles técnicos.",
      items: [],
    });
  }

  return panels;
}

export function formatDuration(seconds = 0) {
  const total = Number(seconds) || 0;
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

export function formatFeedDuration(seconds = 0) {
  const total = Number(seconds) || 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(
    remaining
  ).padStart(2, "0")}`;
}

export async function saveEpisode(input = {}) {
  const normalized = normalizeEpisode({
    ...input,
    slug: input.slug || slugify(input.title || ""),
  });

  const supabase = getSupabaseAdminClient();
  if (supabase) {
    const payload = {
      id: normalized.id,
      title: normalized.title,
      slug: normalized.slug,
      description: normalized.description,
      audio_url: normalized.audio_url,
      cover_url: normalized.cover_url,
      duration: normalized.duration,
      published_at: normalized.published_at,
      trend_keyword: normalized.trend_keyword,
      transcript: normalized.transcript,
      article_body: normalized.article_body,
      article_images: normalized.article_images,
    };

    const { error } = await supabase.from("trendcast_episodes").upsert(payload, {
      onConflict: "slug",
    });

    if (!error) {
      return normalized;
    }
  }

  const localEpisodes = await readLocalEpisodes();
  const filtered = localEpisodes.filter((episode) => episode.slug !== normalized.slug);
  filtered.push({
    id: normalized.id,
    title: normalized.title,
    slug: normalized.slug,
    description: normalized.description,
    audio_url: normalized.audio_url,
    cover_url: normalized.cover_url,
    duration: normalized.duration,
    published_at: normalized.published_at,
    trend_keyword: normalized.trend_keyword,
    transcript: normalized.transcript,
    article_body: normalized.article_body,
    article_images: normalized.article_images,
  });
  filtered.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
  await writeLocalEpisodes(filtered);
  return normalized;
}

function getManagedStoragePath(url, bucketName) {
  try {
    const parsed = new URL(String(url || ""));
    const marker = `/storage/v1/object/public/${bucketName}/`;
    const index = parsed.pathname.indexOf(marker);
    return index >= 0 ? decodeURIComponent(parsed.pathname.slice(index + marker.length)) : null;
  } catch {
    return null;
  }
}

async function removeManagedStorageObject(supabase, bucketName, url) {
  const storagePath = getManagedStoragePath(url, bucketName);
  if (!storagePath) return;
  const { error } = await supabase.storage.from(bucketName).remove([storagePath]);
  if (error) throw new Error(`No se pudo borrar el archivo asociado (${bucketName}).`);
}

export async function deleteEpisode(slug) {
  const normalizedSlug = String(slug || "").trim();
  if (!normalizedSlug) throw new Error("Falta el episodio que se quiere eliminar.");

  const supabase = getSupabaseAdminClient();
  if (supabase) {
    const { data: episode, error: lookupError } = await supabase
      .from("trendcast_episodes")
      .select("slug,audio_url,cover_url")
      .eq("slug", normalizedSlug)
      .maybeSingle();
    if (lookupError) throw lookupError;

    if (episode) {
      // Nunca tocamos URLs externas: solo activos alojados en los buckets de Viralia.
      await removeManagedStorageObject(supabase, "trendcast-audio", episode.audio_url);
      const { error: scriptError } = await supabase.storage
        .from("trendcast-audio")
        .remove([`scripts/${normalizedSlug}.txt`]);
      if (scriptError) throw new Error("No se pudo borrar el guion asociado.");
      await removeManagedStorageObject(supabase, "trendcast-media", episode.cover_url);
      const { error } = await supabase.from("trendcast_episodes").delete().eq("slug", normalizedSlug);
      if (error) throw error;
    }
  }

  const localEpisodes = await readLocalEpisodes();
  const filtered = localEpisodes.filter((episode) => episode.slug !== normalizedSlug);
  if (filtered.length !== localEpisodes.length) await writeLocalEpisodes(filtered);

  return { slug: normalizedSlug };
}

export async function ensureTrendcastBucket() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { enabled: false };
  }

  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((bucket) => bucket.name === "trendcast-audio");

  if (!exists) {
    await supabase.storage.createBucket("trendcast-audio", {
      public: true,
      fileSizeLimit: 52428800,
    });
  }

  return { enabled: true };
}

export async function uploadEpisodeAudio(slug, file) {
  if (!file || !file.size) {
    return null;
  }

  const fileName = `${slug || "episode"}-${Date.now()}.mp3`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const supabase = getSupabaseAdminClient();

  if (supabase) {
    await ensureTrendcastBucket();
    const storagePath = `episodes/${fileName}`;
    const { error } = await supabase.storage
      .from("trendcast-audio")
      .upload(storagePath, buffer, {
        contentType: file.type || "audio/mpeg",
        upsert: true,
      });

    if (!error) {
      const { data } = supabase.storage.from("trendcast-audio").getPublicUrl(storagePath);
      return data.publicUrl;
    }
  }

  await mkdir(PUBLIC_UPLOADS_DIR, { recursive: true });
  const localPath = path.join(PUBLIC_UPLOADS_DIR, fileName);
  await writeFile(localPath, buffer);
  return `/trendcast/uploads/${fileName}`;
}

export async function seedDemoEpisode() {
  await mkdir(PUBLIC_AUDIO_DIR, { recursive: true });
  return saveEpisode(demoEpisode);
}

export async function buildPodcastFeedXml() {
  const episodes = await getEpisodes();
  const siteUrl = getSiteUrl();
  const podcastImage = toAbsoluteUrl(DEFAULT_COVER);
  const itemXml = await Promise.all(
    episodes.map(async (episode) => {
      const pubDate = new Date(episode.published_at).toUTCString();
      const enclosureLength = await getEnclosureLength(episode.audio_url);
      return `
    <item>
      <title>${escapeXml(buildFeedItemTitle(episode))}</title>
      <description>${escapeXml(episode.description)}</description>
      <content:encoded><![CDATA[${buildEpisodeSummaryHtml(episode)}]]></content:encoded>
      <link>${escapeXml(episode.episodeUrlAbsolute)}</link>
      <guid isPermaLink="true">${escapeXml(episode.episodeUrlAbsolute)}</guid>
      <pubDate>${escapeXml(pubDate)}</pubDate>
      <enclosure url="${escapeXml(episode.audioUrlAbsolute)}" type="audio/mpeg" length="${enclosureLength}" />
      <category>${escapeXml(episode.trend_keyword || "tendencias virales")}</category>
      <itunes:author>${escapeXml(PODCAST_CONFIG.author)}</itunes:author>
      <itunes:summary>${escapeXml(episode.seoDescription)}</itunes:summary>
      <itunes:duration>${escapeXml(formatFeedDuration(episode.duration))}</itunes:duration>
      <itunes:explicit>${PODCAST_CONFIG.explicit}</itunes:explicit>
      <itunes:image href="${escapeXml(episode.coverUrlAbsolute)}" />
      <itunes:episodeType>full</itunes:episodeType>
      <itunes:keywords>${escapeXml(buildFeedKeywords(episode))}</itunes:keywords>
    </item>`;
    })
  );

  const items = itemXml.join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(PODCAST_CONFIG.name)}</title>
    <link>${escapeXml(toAbsoluteUrl("/viralia"))}</link>
    <language>${escapeXml(PODCAST_CONFIG.language)}</language>
    <description>${escapeXml(buildFeedChannelDescription())}</description>
    <atom:link href="${escapeXml(`${siteUrl}/feed.xml`)}" rel="self" type="application/rss+xml" />
    <itunes:type>episodic</itunes:type>
    <itunes:author>${escapeXml(PODCAST_CONFIG.author)}</itunes:author>
    <itunes:owner>
      <itunes:name>${escapeXml(PODCAST_CONFIG.owner)}</itunes:name>
      <itunes:email>${escapeXml(PODCAST_CONFIG.email)}</itunes:email>
    </itunes:owner>
    <itunes:summary>${escapeXml(buildFeedChannelDescription())}</itunes:summary>
    <itunes:explicit>${PODCAST_CONFIG.explicit}</itunes:explicit>
    <itunes:image href="${escapeXml(podcastImage)}" />
    <itunes:keywords>${escapeXml(PODCAST_CONFIG.keywords.join(", "))}</itunes:keywords>
    <itunes:category text="${escapeXml(PODCAST_CONFIG.category)}">
      <itunes:category text="${escapeXml(PODCAST_CONFIG.subcategory)}" />
    </itunes:category>
${items}
  </channel>
</rss>`;
}
