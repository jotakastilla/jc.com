import { getEpisodes } from "../lib/trendcast";
import { toAbsoluteUrl } from "../lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap() {
  const episodes = await getEpisodes();
  return [
    {
      url: toAbsoluteUrl("/viralia"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: toAbsoluteUrl("/viralia/radar"),
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.8,
    },
    ...episodes.map((episode) => ({
      url: toAbsoluteUrl(`/viralia/${episode.slug}`),
      lastModified: new Date(episode.published_at || Date.now()),
      changeFrequency: "monthly",
      priority: 0.8,
    })),
  ];
}
