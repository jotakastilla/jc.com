import type { MetadataRoute } from "next";
import { academyConfig } from "@/lib/academy-config";
import { lessons } from "@/lib/content";
import { masterclassModules } from "@/lib/masterclass";

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
    ...lessons.map((lesson) => ({ url: url(`/contenidos/${lesson.slug}`), lastModified, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...masterclassModules.map((module) => ({ url: url(`/masterclass/${module.slug}`), lastModified, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
