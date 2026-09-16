import Link from "next/link";
import type { Metadata } from "next";
import { AudioImprovementDemo } from "./components/AudioImprovementDemo";
import { TopicRequest } from "./components/TopicRequest";
import { Footer } from "./components/Footer";
import { CourseIntro } from "./components/CourseIntro";
import { MasterclassDetails } from "./components/MasterclassDetails";
import { academyConfig } from "@/lib/academy-config";

export const metadata: Metadata = { title: "Curso de podcast presencial en Madrid", description: "Masterclass de 10 horas en estudio profesional en Madrid: podcast, videopodcast, audio, edición y publicación.", alternates: { canonical: "/" } };

export default function Home() {
  const course = { "@context": "https://schema.org", "@type": "Course", name: "Curso de podcast presencial en Madrid", description: "Masterclass práctica de 10 horas sobre podcast, videopodcast, audio, edición y publicación en un estudio profesional de Madrid.", provider: { "@type": "EducationalOrganization", name: academyConfig.brandName, url: academyConfig.siteUrl }, instructor: { "@type": "Person", name: "Jonathan Castilla" }, offers: { "@type": "Offer", price: "249", priceCurrency: "EUR", availability: "https://schema.org/PreOrder", url: `${academyConfig.siteUrl}/#proximas` }, hasCourseInstance: { "@type": "CourseInstance", courseMode: "onsite", courseWorkload: "PT10H", location: { "@type": "Place", name: "Local Reset", address: { "@type": "PostalAddress", streetAddress: "San Restituto, 25", addressLocality: "Madrid", postalCode: "28039", addressCountry: "ES" } } } };
  return <main className="shell">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(course) }} />
    <nav><Link className="brand" href="/">LOCAL RESET <i>ACADEMY</i></Link><span><Link href="#masterclass">Masterclass</Link><Link href="#masterclass-info">Programa</Link><Link href="/areas">Guías</Link><Link href="#proximas">Próximas fechas</Link></span></nav>
    <section className="hero"><div><small>FORMACIÓN PRÁCTICA EN LOCAL RESET</small><em>IDEA · AUDIO · VÍDEO · PUBLICACIÓN</em><h1>Aprende a<br /><b>crear mejor.</b></h1><p>Masterclasses presenciales para crear contenido con criterio, herramientas y práctica real.</p><div className="actions"><Link className="btn" href="#masterclass">Ver Masterclass</Link></div></div><div className="signal"><header>REC ●　CAM 01　AUDIO　EDICIÓN</header><label>LOCAL RESET / CONTENIDO EN MOVIMIENTO</label><AudioImprovementDemo /><footer><b>PRÓXIMA EDICIÓN</b><span>OCTUBRE</span></footer></div></section>
    <CourseIntro />
    <MasterclassDetails />
    <section id="proximas" className="library"><div className="libraryHead"><div><small>PRÓXIMA EDICIÓN · OCTUBRE</small><h2>¿Te vienes a<br /><b>la próxima?</b></h2></div></div><p className="libraryIntro">Déjanos tus datos y recibirás las fechas, el programa completo y el aviso de apertura de plazas para la próxima Masterclass.</p><TopicRequest /></section>
    <Footer />
  </main>;
}
