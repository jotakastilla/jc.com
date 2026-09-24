import Link from "next/link";
import type { Metadata } from "next";
import { AudioImprovementDemo } from "./components/AudioImprovementDemo";
import { TopicRequest } from "./components/TopicRequest";
import { Footer } from "./components/Footer";
import { CourseIntro } from "./components/CourseIntro";
import { AccessGuide } from "./components/AccessGuide";
import { MasterclassDetails } from "./components/MasterclassDetails";
import { AccountNav } from "./components/AccountNav";
import { AcademyPlatform } from "./components/AcademyPlatform";
import { academyConfig } from "@/lib/academy-config";

export const metadata: Metadata = { title: "Aprende a crear, producir y hacer crecer tu podcast", description: "Formación práctica, recursos, herramientas y experiencias reales de estudio para crear, producir y hacer crecer tu podcast.", alternates: { canonical: "/" } };

export default function Home() {
  const upcomingEditions = academyConfig.upcomingEditions;
  const course = { "@context": "https://schema.org", "@type": "Course", name: "Masterclass presencial de podcast", description: "Masterclass práctica de 10 horas sobre podcast, videopodcast, audio, edición y publicación en un estudio profesional de Madrid.", provider: { "@type": "EducationalOrganization", name: academyConfig.brandName, url: academyConfig.siteUrl }, instructor: { "@type": "Person", name: "Jonathan Castilla" }, offers: { "@type": "Offer", price: "390", priceCurrency: "EUR", availability: "https://schema.org/PreOrder", url: `${academyConfig.siteUrl}/premium` }, hasCourseInstance: { "@type": "CourseInstance", courseMode: "onsite", courseWorkload: "PT10H", location: { "@type": "Place", name: "Local Reset", address: { "@type": "PostalAddress", streetAddress: "San Restituto, 25", addressLocality: "Madrid", postalCode: "28039", addressCountry: "ES" } } } };
  return <main className="shell"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(course) }} />
    <nav><Link className="brand" href="/">LOCAL RESET <i>ACADEMY</i></Link><span><Link href="#academy">Academy</Link><Link href="#biblioteca">Biblioteca</Link><Link href="#directos">Directos</Link><Link href="#masterclass">Masterclass</Link><AccountNav /></span></nav>
    <section className="hero academyHero"><div style={{ textAlign: "center" }}><small>LOCAL RESET ACADEMY</small><em>FORMACIÓN PRÁCTICA · DIRECTOS · RECURSOS · HERRAMIENTAS</em><h1 className="academyHeroTitle"><span>Aprende a crear,</span><span>producir y hacer crecer</span><b><i>tu</i> podcast.</b></h1><p style={{ marginInline: "auto" }}>Academy nace dentro de un estudio profesional: aprende con procesos reales, recursos útiles y formación que evoluciona contigo.</p><div className="actions" style={{ justifyContent: "center" }}><Link className="btn" href="#biblioteca">Explorar Academy →</Link><Link className="textLink" href="#masterclass">Ver Masterclass presencial</Link></div></div><div className="signal"><header>REC ●　CAM 01　AUDIO　EDICIÓN</header><label>LOCAL RESET / CONTENIDO EN MOVIMIENTO</label><AudioImprovementDemo /><footer><b>ACADEMY · ABIERTO, FREE Y PREMIUM</b><span>Aprende desde donde estés</span></footer></div></section>
    <AcademyPlatform />
    <AccessGuide />
    <CourseIntro />
    <MasterclassDetails />
    <section id="proximas" className="library upcomingEdition"><div className="editionCopy"><div className="libraryHead"><div><small>PRÓXIMA EDICIÓN · 390 €</small><h2>¿Te vienes a<br /><b>la próxima?</b></h2></div></div><p className="libraryIntro">Estamos cerrando qué día de octubre será la próxima edición. Queda muy poco: apúntate gratis a la lista prioritaria y te avisaremos en cuanto lo confirmemos. Si te encaja, podrás pagar 50 € para reservar tu plaza.</p><aside className="editionStudio" style={{ backgroundImage: "linear-gradient(180deg, #0b0d1214 28%, #0b0d12e8 100%), url('/images/studio/grabacion-entrevista.png')" }}><small>LOCAL RESET / MADRID</small><b>Prueba y graba<br />en nuestro estudio</b><span>8 PLAZAS · ESTUDIO PROFESIONAL</span></aside></div><div className="editionRight"><aside className="editionVisual" style={{ backgroundImage: "linear-gradient(135deg, #0b0d12 0%, #0b0d1266 48%, #0b0d1214 100%), url('/images/editions/aula-mezcla.jpg')" }}><small>LOCAL RESET STUDIOS</small><b>Masterclass<br />presencial</b><span>10 HORAS · MADRID</span></aside><TopicRequest /></div></section>
    <Footer />
  </main>;
}
