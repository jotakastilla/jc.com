import { getSiteUrl } from "../lib/site";

export default function robots() {
  const siteUrl = getSiteUrl();
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/viralia/admin", "/api/"] },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
