import type { MetadataRoute } from "next";
import { academyConfig } from "@/lib/academy-config";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" }, sitemap: `${academyConfig.siteUrl}/sitemap.xml` };
}
