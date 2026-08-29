function cleanText(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

const LOW_QUALITY_LANGUAGE = /\b(gilipollas|idiota|imbecil|subnormal|mierda|puta|puto|maldito|asco)\b/i;

function engagement(post) {
  const metrics = post.metrics || {};
  return Number(metrics.like_count || 0) + Number(metrics.retweet_count || 0) * 2 + Number(metrics.quote_count || 0) * 2;
}

export async function searchXNativeVideoCandidates(topic) {
  const token = String(process.env.X_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN || "").trim();
  const safeTopic = cleanText(topic);
  if (!token || !safeTopic) return { available: Boolean(token), videos: [] };

  const params = new URLSearchParams({
    query: `(${safeTopic}) lang:es has:videos -is:retweet -is:reply`,
    max_results: "10",
    "tweet.fields": "created_at,public_metrics,author_id,attachments",
    expansions: "author_id,attachments.media_keys",
    "user.fields": "username,name,verified",
    "media.fields": "media_key,type,variants,duration_ms",
  });
  const response = await fetch(`https://api.x.com/2/tweets/search/recent?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`X no pudo consultar publicaciones: ${response.status}`);
  const payload = await response.json();
  const users = new Map((payload.includes?.users || []).map((user) => [user.id, user]));
  const media = new Map((payload.includes?.media || []).map((item) => [item.media_key, item]));
  return {
    available: true,
    videos: (payload.data || []).flatMap((post) => {
      const user = users.get(post.author_id);
      const video = (post.attachments?.media_keys || []).map((key) => media.get(key)).find((item) => item?.type === "video");
      const mediaUrl = (video?.variants || [])
        .filter((variant) => variant.content_type === "video/mp4" && variant.url)
        .sort((a, b) => Number(a.bit_rate || 0) - Number(b.bit_rate || 0))[0]?.url;
      if (!video || !mediaUrl) return [];
      return [{
        id: post.id,
        mediaKey: video.media_key,
        mediaUrl,
        durationSeconds: Number(video.duration_ms || 0) / 1000,
        text: cleanText(post.text),
        author: user?.username ? `@${user.username}` : "X",
        authorName: user?.name || "",
        authorVerified: Boolean(user?.verified),
        postedAt: post.created_at || null,
        metrics: post.public_metrics || {},
        url: `https://x.com/${user?.username || "i"}/status/${post.id}`,
      }];
    }).filter((post) => post.text.length >= 20 && !LOW_QUALITY_LANGUAGE.test(post.text) && post.durationSeconds >= 5)
      .sort((a, b) => Number(b.authorVerified) - Number(a.authorVerified) || engagement(b) - engagement(a)).slice(0, 3),
  };
}
