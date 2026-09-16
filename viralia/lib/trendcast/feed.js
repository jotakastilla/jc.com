import { readFile, stat } from "fs/promises";
import path from "path";
import { getSiteUrl, toAbsoluteUrl } from "../site";

const EPISODES_PATH = path.join(process.cwd(), "trendcast", "data", "episodes.local.json");
const DEFAULT_COVER = "/trendcast/viralia-cover.png";
const DEFAULT_AUDIO = "/trendcast/audio/demo-queso.mp3";

const PODCAST_CONFIG = {
  name: "Viralia",
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

function splitTrendKeywords(value = "") {
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatFeedDuration(seconds = 0) {
  const total = Math.max(0, Number.parseInt(seconds, 10) || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;

  if (hours > 0) {
    return [hours, minutes, remainder]
      .map((part) => String(part).padStart(2, "0"))
      .join(":");
  }

  return [minutes, remainder].map((part) => String(part).padStart(2, "0")).join(":");
}

function buildFeedChannelDescription() {
  return `${PODCAST_CONFIG.description} ${PODCAST_CONFIG.seoDescription}`;
}

function buildFeedItemTitle(episode) {
  const keywords = splitTrendKeywords(episode.trend_keyword).slice(0, 2);
  return keywords.length ? `${episode.title} | ${keywords.join(" y ")}` : episode.title;
}

function buildFeedKeywords(episode) {
  return [...new Set([...splitTrendKeywords(episode.trend_keyword), ...PODCAST_CONFIG.keywords])]
    .slice(0, 12)
    .join(", ");
}

function buildEpisodeSummaryHtml(episode) {
  const keywords = splitTrendKeywords(episode.trend_keyword);
  const intro = `<p>${escapeXml(episode.description)}</p>`;
  const keywordBlock = keywords.length
    ? `<p><strong>Temas clave:</strong> ${escapeXml(keywords.join(", "))}.</p>`
    : "";

  return `${intro}${keywordBlock}`;
}

function normalizeEpisode(row = {}) {
  const slug = row.slug || slugify(row.title || demoEpisode.title);
  const description = row.description || demoEpisode.description;
  const trendKeyword = row.trend_keyword || demoEpisode.trend_keyword;
  const audioUrl = row.audio_url || DEFAULT_AUDIO;
  const coverUrl = row.cover_url || DEFAULT_COVER;

  return {
    id: row.id || slug,
    title: row.title || demoEpisode.title,
    slug,
    description,
    audio_url: audioUrl,
    cover_url: coverUrl,
    duration: typeof row.duration === "number" ? row.duration : Number.parseInt(row.duration, 10) || demoEpisode.duration,
    published_at: row.published_at || demoEpisode.published_at,
    trend_keyword: trendKeyword,
    seoDescription:
      row.seo_description ||
      `${description} Temas del episodio: ${trendKeyword}. Episodio de Viralia sobre tendencias de búsqueda y cultura de internet en España.`,
    audioUrlAbsolute: toAbsoluteUrl(audioUrl),
    coverUrlAbsolute: toAbsoluteUrl(coverUrl),
    episodeUrlAbsolute: toAbsoluteUrl(`/viralia/${slug}`),
  };
}

async function readLocalEpisodes() {
  try {
    const raw = await readFile(EPISODES_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [demoEpisode];
    }
    return parsed;
  } catch {
    return [demoEpisode];
  }
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

  return 0;
}

export async function buildPodcastFeedXml() {
  const rawEpisodes = await readLocalEpisodes();
  const episodes = rawEpisodes
    .map(normalizeEpisode)
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
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
${itemXml.join("\n")}
  </channel>
</rss>`;
}
