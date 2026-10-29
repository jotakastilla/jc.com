import type { MetadataRoute } from "next";
import { academyConfig } from "@/lib/academy-config";
import { freeArticleSlugs } from "@/lib/content";

const url = (path: string) => new URL(path, academyConfig.siteUrl).toString();

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: url("/"), lastModified, changeFrequency: "weekly", priority: 1 },
    { url: url("/areas"), lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: url("/rutas"), lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: url("/empresas"), lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: url("/curso-podcast-madrid"), lastModified, changeFrequency: "weekly", priority: 0.95 },
    { url: url("/estudio-podcast-madrid"), lastModified, changeFrequency: "monthly", priority: 0.85 },
    // Only submit complete, public guides. Gated lessons and paid masterclass
    // modules are useful product pages, but are not standalone search content.
    ...freeArticleSlugs.map((slug) => ({ url: url(`/contenidos/${slug}`), lastModified, changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
