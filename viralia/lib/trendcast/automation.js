import { createClient } from "@supabase/supabase-js";
import { toAbsoluteUrl } from "../site.js";
import { findViraliaSpecialCandidate, generateViraliaEpisode, getViraliaRuntimeHealth } from "../../scripts/generate-viralia-episode.mjs";

const madridTimeZone = "Europe/Madrid";

function isAutopublishEnabled() {
  if (process.env.VERCEL === "1" || process.env.NODE_ENV === "production") {
    return true;
  }

  return String(process.env.VIRALIA_AUTOPUBLISH_ENABLED || "").trim().toLowerCase() === "true";
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getMadridHour(date = new Date()) {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: madridTimeZone,
    }).format(date)
  );
}

function getMadridTimeParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: madridTimeZone,
  }).formatToParts(date);

  const partMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    hour: Number(partMap.hour || "0"),
    minute: Number(partMap.minute || "0"),
  };
}

function formatMadridDateParts(date = new Date()) {
  return {
    dayKey: new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: madridTimeZone,
    }).format(date),
  };
}

function buildViraliaSlotParts(date = new Date()) {
  return {
    slotStartHour: 7,
    slotKey: "0730",
    slotDayKey: formatMadridDateParts(date).dayKey,
  };
}

function isWithinMorningProductionWindow(date = new Date()) {
  const { hour, minute } = getMadridTimeParts(date);
  // El cron se declara a las 05:30 y 06:30 UTC. Esta compuerta absorbe el
  // cambio de horario de Madrid y deja una única pasada alrededor de las 07:30.
  return hour === 7 && minute >= 20 && minute <= 50;
}

function isWithinMorningRecoveryWindow(date = new Date()) {
  const { hour } = getMadridTimeParts(date);
  // Vercel no reintenta un cron que falla. El monitor editorial, que ya se
  // ejecuta cada media hora, puede recuperar una edición perdida durante la
  // mañana sin dejar el monitor editorial en modo recuperación todo el día.
  return hour >= 8 && hour <= 12;
}

async function getEpisodeBySlug(supabase, slug) {
  const { data, error } = await supabase
    .from("trendcast_episodes")
    .select("slug,published_at")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data || null;
}

async function getEpisodeForMadridDay(supabase, dayKey) {
  // Slugs include the generation timestamp, so checking a synthetic 08:00
  // slug cannot prevent a second daily run. Look at recent publications and
  // compare their real Madrid calendar day instead.
  const since = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("trendcast_episodes")
    .select("slug,published_at")
    .gte("published_at", since)
    .order("published_at", { ascending: false });

  if (error) return null;
  return (data || []).find((episode) => formatMadridDateParts(new Date(episode.published_at)).dayKey === dayKey) || null;
}

async function hasRecentSpecialWithTopic(supabase, topic) {
  const since = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("trendcast_episodes")
    .select("slug,title,published_at,trend_keyword")
    .gte("published_at", since)
    .ilike("trend_keyword", `%${String(topic || "").replace(/[%_]/g, "")}%`);

  if (error) return null;
  return data?.[0] || null;
}

export async function runViraliaAutomation({ force = false, scheduledPublishAt = null } = {}) {
  if (!isAutopublishEnabled()) {
    return {
      ok: true,
      status: "paused",
      reason: "Viralia autopublish is disabled until the audio pipeline is approved.",
    };
  }

  const generatedAt = new Date();
  if (!force && !scheduledPublishAt && !isWithinMorningProductionWindow(generatedAt)) {
    return {
      ok: true,
      status: "skipped",
      reason: "La producción diaria de Viralia solo se inicia alrededor de las 07:30 de Madrid.",
    };
  }

  const { slotKey, slotStartHour, slotDayKey } = buildViraliaSlotParts(generatedAt);
  const supabase = getSupabaseClient();

  if (!force) {
    const scheduledEpisode = await getEpisodeForMadridDay(supabase, slotDayKey);
    if (scheduledEpisode) {
      return {
        ok: true,
        status: "skipped",
        reason: "An automated Viralia episode already exists for this scheduled slot.",
        slug: scheduledEpisode.slug,
        episodeUrl: toAbsoluteUrl(`/viralia/${scheduledEpisode.slug}`),
      };
    }
  }

  // La ejecución programada usa el mismo generador y montaje Vocolia que una
  // edición preparada manualmente; solo cambia el briefing, que es matinal.
  const generated = await generateViraliaEpisode({ mode: "morning", publishedAt: scheduledPublishAt });
  const fallbackSlug = `viralia-${slotDayKey}-${String(slotStartHour).padStart(2, "0")}`;
  const publishedSlug = String(generated?.publication?.slug || generated?.publication?.storagePath || generated?.slug || fallbackSlug).trim() || fallbackSlug;

  return {
    ok: true,
    status: "published",
    slug: publishedSlug,
    episodeUrl: toAbsoluteUrl(`/viralia/${publishedSlug}`),
    audioUrl: generated?.publication?.audioUrl || (generated?.outputRelative ? toAbsoluteUrl(generated.outputRelative) : null),
    title: generated?.generatedTitle || null,
  };
}

export async function runViraliaPrepublishAutomation() {
  if (!isAutopublishEnabled()) return { ok: true, status: "paused", reason: "Viralia autopublish is disabled." };
  const now = new Date();
  const { hour, minute } = getMadridTimeParts(now);
  if (hour !== 7 || minute < 30 || minute > 55) {
    return { ok: true, status: "skipped", reason: "La producción diaria solo se ejecuta alrededor de las 07:30 de Madrid." };
  }
  // Compatibilidad con invocaciones antiguas: publica al terminar, sin una hora fija.
  return runViraliaAutomation({ force: true });
}

export async function runViraliaSpecialMonitor() {
  if (!isAutopublishEnabled()) {
    return { ok: true, status: "paused", reason: "Viralia autopublish is disabled." };
  }

  const now = new Date();
  if (isWithinMorningRecoveryWindow(now)) {
    const supabase = getSupabaseClient();
    const { dayKey } = formatMadridDateParts(now);
    const morningEpisode = await getEpisodeForMadridDay(supabase, dayKey);

    if (!morningEpisode) {
      return {
        ...(await runViraliaAutomation({ force: true })),
        recovery: true,
        reason: "Recuperación automática de la edición matinal que no llegó a publicarse.",
      };
    }
  }

  const { topTrends, editorialSelection } = await findViraliaSpecialCandidate();
  if (!editorialSelection?.selected?.length) {
    return { ok: true, status: "skipped", reason: "No hay una noticia con relevancia suficiente para un especial." };
  }

  const supabase = getSupabaseClient();
  const topic = editorialSelection.selected[0].keyword;
  const existing = await hasRecentSpecialWithTopic(supabase, topic);
  if (existing) {
    return {
      ok: true,
      status: "skipped",
      reason: "Ese acontecimiento ya tiene un episodio reciente.",
      slug: existing.slug,
      episodeUrl: toAbsoluteUrl(`/viralia/${existing.slug}`),
    };
  }

  const generated = await generateViraliaEpisode({
    mode: "special",
    topTrendsOverride: topTrends,
    editorialSelectionOverride: editorialSelection,
  });
  const publishedSlug = String(generated?.publication?.slug || generated?.slug || "").trim();
  return {
    ok: true,
    status: "published",
    kind: "special",
    reason: editorialSelection.special_candidate?.reason,
    slug: publishedSlug,
    title: generated?.generatedTitle || null,
    episodeUrl: publishedSlug ? toAbsoluteUrl(`/viralia/${publishedSlug}`) : null,
    audioUrl: generated?.publication?.audioUrl || null,
  };
}

export async function getViraliaAutomationHealth() {
  return getViraliaRuntimeHealth();
}
