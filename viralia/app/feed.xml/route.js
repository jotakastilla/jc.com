import { buildPodcastFeedXml } from "../../lib/trendcast";

export const dynamic = "force-dynamic";

export async function GET() {
  const xml = await buildPodcastFeedXml();

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
