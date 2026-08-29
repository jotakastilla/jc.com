// Dominio público de respaldo. Cuando Viralia tenga dominio propio, se sustituye
// con NEXT_PUBLIC_SITE_URL en Vercel sin cambiar los enlaces publicados.
const DEFAULT_SITE_URL = "https://viralia-temporal.vercel.app";

export function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  if (process.env.SITE_URL) {
    return process.env.SITE_URL;
  }

  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelUrl) {
    return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return DEFAULT_SITE_URL;
}

export function toAbsoluteUrl(pathname = "/") {
  if (!pathname) {
    return getSiteUrl();
  }

  if (pathname.startsWith("http://") || pathname.startsWith("https://")) {
    return pathname;
  }

  return `${getSiteUrl()}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}
