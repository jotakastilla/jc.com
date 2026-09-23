import Link from "next/link";
import type { Metadata } from "next";
import { AudioImprovementDemo } from "./components/AudioImprovementDemo";
import { TopicRequest } from "./components/TopicRequest";
import { Footer } from "./components/Footer";
import { CourseIntro } from "./components/CourseIntro";
import { AccessGuide } from "./components/AccessGuide";
import { MasterclassDetails } from "./components/MasterclassDetails";
import { AccountNav } from "./components/AccountNav";
import { HomePodcastGuide } from "./components/HomePodcastGuide";
import { academyConfig } from "@/lib/academy-config";

export const metadata: Metadata = { title: "Curso de podcast presencial en Madrid", description: "Masterclass de 10 horas en estudio profesional en Madrid: podcast, videopodcast, audio, edición y publicación.", alternates: { canonical: "/" } };

export default function Home() {
  const upcomingEditions = academyConfig.upcomingEditions;
  const course = { "@context": "https://schema.org", "@type": "Course", name: "Curso de podcast presencial en Madrid", description: "Masterclass práctica de 10 horas sobre podcast, videopodcast, audio, edición y publicación en un estudio profesional de Madrid.", provider: { "@type": "EducationalOrganization", name: academyConfig.brandName, url: academyConfig.siteUrl }, instructor: { "@type": "Person", name: "Jonathan Castilla" }, offers: { "@type": "Offer", price: "390", priceCurrency: "EUR", availability: "https://schema.org/PreOrder", url: `${academyConfig.siteUrl}/#proximas` }, hasCourseInstance: { "@type": "CourseInstance", courseMode: "onsite", courseWorkload: "PT10H", location: { "@type": "Place", name: "Local Reset", address: { "@type": "PostalAddress", streetAddress: "San Restituto, 25", addressLocality: "Madrid", postalCode: "28039", addressCountry: "ES" } } } };
  return <main className="shell"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(course) }} />
    <nav><Link className="brand" href="/">LOCAL RESET <i>ACADEMY</i></Link><span><Link href="#masterclass">Masterclass</Link><Link href="#masterclass-info">Programa</Link><Link href="/areas">Guías</Link><Link href="#proximas">Próximas fechas</Link><AccountNav /></span></nav>
    <section className="hero"><div style={{ textAlign: "center" }}><small>LOCAL RESET STUDIOS · FORMACIÓN PRESENCIAL</small><em>PODCAST · VÍDEO · AUDIO · PUBLICACIÓN</em><h1>Masterclass presencial<br /><b>de podcast</b></h1><p style={{ marginInline: "auto" }}>Crea, graba y publica tu podcast. 10 horas prácticas en Local Reset Studios.</p><p className="heroDate">Octubre de 2026 · fecha exacta próximamente<br />· 8 plazas · 390 € IVA incluido</p><div className="actions" style={{ justifyContent: "center" }}><Link className="btn" href="#proximas">Apuntarme a la lista prioritaria →</Link><Link className="textLink" href="#masterclass-info">Ver el programa</Link></div></div><div className="signal"><header>REC ●　CAM 01　AUDIO　EDICIÓN</header><label>LOCAL RESET / CONTENIDO EN MOVIMIENTO</label><AudioImprovementDemo /><footer><b>PRÓXIMA EDICIÓN</b><span>Octubre de 2026</span></footer></div></section>
    <HomePodcastGuide />
    <CourseIntro />
    <AccessGuide />
    <MasterclassDetails />
    <section id="proximas" className="library upcomingEdition"><div className="editionCopy"><div className="libraryHead"><div><small>PRÓXIMA EDICIÓN · 390 €</small><h2>¿Te vienes a<br /><b>la próxima?</b></h2></div></div><p className="libraryIntro">Estamos cerrando qué día de octubre será la próxima edición. Queda muy poco: apúntate gratis a la lista prioritaria y te avisaremos en cuanto lo confirmemos. Si te encaja, podrás pagar 50 € para reservar tu plaza.</p><TopicRequest /></div><aside className="editionVisual" style={{ backgroundImage: "linear-gradient(135deg, #0b0d12 0%, #0b0d1266 48%, #0b0d1214 100%), url('/images/editions/aula-mezcla.jpg')" }}><small>LOCAL RESET STUDIOS</small><b>Una clase<br />con las manos<br />en la mesa</b><span>10 HORAS · MADRID</span></aside></section>
    <Footer />
  </main>;
}
