function officialScore(channel = "", title = "") {
  const value = `${channel} ${title}`.toLowerCase();
  if (/oficial|official|gobierno|presidencia|ministerio|congreso|parlamento|ayuntamiento|federaci[oó]n|real federaci[oó]n/.test(value)) return 3;
  if (/directo|rueda de prensa|comparecencia|entrevista completa/.test(value)) return 2;
  return 1;
}

export async function searchYouTubeOriginalSources(query, options = {}) {
  const apiKey = String(process.env.YOUTUBE_API_KEY || process.env.VIRALIA_YOUTUBE_API_KEY || "").trim();
  const safeQuery = String(query || "").replace(/\s+/g, " ").trim();
  if (!safeQuery || !apiKey) return { available: Boolean(apiKey), results: [] };

  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: "8",
    relevanceLanguage: "es",
    q: safeQuery,
    key: apiKey,
  });
  if (options.publishedAfter) params.set("publishedAfter", new Date(options.publishedAfter).toISOString());
  if (options.order === "date") params.set("order", "date");
  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`YouTube no pudo buscar fuentes: ${response.status}`);
  const payload = await response.json();

  return {
    available: true,
    results: (payload.items || []).map((item) => ({
      videoId: item.id?.videoId,
      title: item.snippet?.title || "Vídeo sin título",
      channel: item.snippet?.channelTitle || "",
      publishedAt: item.snippet?.publishedAt || null,
      description: item.snippet?.description || "",
      url: item.id?.videoId ? `https://www.youtube.com/watch?v=${item.id.videoId}` : null,
    })).filter((item) => item.url).sort((a, b) => officialScore(b.channel, b.title) - officialScore(a.channel, a.title)),
  };
}
