import type { Metadata } from "next";
import "./globals.css";
import "./structure.css";
import "./masterclass-program.css";
import { academyConfig } from "@/lib/academy-config";

export const metadata: Metadata = {
  metadataBase: new URL(academyConfig.siteUrl),
  title: { default: "Local Reset Academy | Formación práctica para podcasters", template: "%s | Local Reset Academy" },
  description: "Formación práctica, recursos, herramientas y experiencias reales de estudio para crear, producir y hacer crecer tu podcast.",
  openGraph: { type: "website", locale: "es_ES", siteName: academyConfig.brandName, title: "Local Reset Academy", description: "Formación práctica para crear, producir y hacer crecer tu podcast." },
  twitter: { card: "summary_large_image", title: "Local Reset Academy", description: "Formación práctica para crear, producir y hacer crecer tu podcast." },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const organization = { "@context": "https://schema.org", "@type": "EducationalOrganization", name: academyConfig.brandName, url: academyConfig.siteUrl, email: "info@localreset.com", address: { "@type": "PostalAddress", streetAddress: "San Restituto, 25", addressLocality: "Madrid", postalCode: "28039", addressCountry: "ES" }, areaServed: { "@type": "City", name: "Madrid" }, parentOrganization: { "@type": "Organization", name: "Local Reset", url: "https://localreset.com" } };
  return <html lang="es"><body><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />{children}</body></html>;
}
