import "./globals.css";
import { getSiteUrl } from "../lib/site";

export const metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Viralia | Podcast de tendencias en audio",
    template: "%s | Viralia",
  },
  description: "Podcast diario sobre tendencias, búsquedas y noticias virales en España, explicado en audio.",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
