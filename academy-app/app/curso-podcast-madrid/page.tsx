import Link from "next/link";
import type { Metadata } from "next";
import { academyConfig } from "@/lib/academy-config";

export const metadata: Metadata = {
  title: "Curso para crear un podcast en Madrid",
  description: "Aprende a crear, grabar, editar y publicar tu podcast con una formación práctica en estudio profesional en Madrid.",
  alternates: { canonical: "/curso-podcast-madrid" },
  openGraph: {
    title: "Curso para crear un podcast en Madrid | Local Reset Academy",
    description: "Formación práctica para pasar de una idea a un podcast publicado.",
  },
};

const faqs = [
  ["¿Necesito experiencia para hacer el curso de podcast?", "No. La formación está pensada para personas que parten de una idea y quieren entender el proceso completo antes de invertir en equipo o ponerse a grabar."],
  ["¿Se aprende a grabar y editar un podcast?", "Sí. Trabajamos idea, formato, guion, grabación, audio, vídeo, edición y publicación con procesos prácticos."],
  ["¿Es una formación presencial?", "La masterclass se realiza presencialmente en Local Reset, Madrid, para poder practicar en un entorno de estudio profesional."],
  ["¿Puedo hacer un videopodcast?", "Sí. La formación explica cuándo tiene sentido usar vídeo, cómo plantear una grabación sencilla y cómo reutilizar el contenido."],
];

export default function PodcastCourseMadridPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "Curso para crear un podcast en Madrid",
    description: "Formación práctica presencial para crear, grabar, editar y publicar un podcast.",
    provider: { "@type": "EducationalOrganization", name: academyConfig.brandName, url: academyConfig.siteUrl },
    location: { "@type": "Place", name: "Local Reset", address: { "@type": "PostalAddress", streetAddress: "San Restituto, 25", addressLocality: "Madrid", postalCode: "28039", addressCountry: "ES" } },
    offers: { "@type": "Offer", price: "390", priceCurrency: "EUR", availability: "https://schema.org/PreOrder", url: `${academyConfig.siteUrl}/premium` },
  };
  const faqSchema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })) };

  return <main className="shell">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    <nav><Link className="brand" href="/">LOCAL RESET <i>ACADEMY</i></Link><span><Link href="/areas">Contenidos</Link><Link href="/rutas">Ruta gratis</Link><Link href="/premium">Masterclass</Link></span></nav>
    <article className="seoLanding">
      <small>CURSO PRESENCIAL DE PODCAST · MADRID</small>
      <h1>Aprende a crear<br />tu <b>podcast</b></h1>
      <p className="seoLead">Una formación práctica para convertir una idea en un podcast que puedas grabar, editar y publicar con criterio.</p>
      <div className="actions"><Link className="btn" href="/premium">Ver próxima masterclass →</Link><Link className="textLink" href="/rutas">Empezar con recursos gratuitos</Link></div>
      <section className="seoGrid">
        <div><small>DE LA IDEA AL PRIMER EPISODIO</small><h2>Qué vas a trabajar</h2><p>Formato, audiencia, escaleta, voz, micrófonos, sonido, vídeo, edición y distribución. El objetivo no es acumular teoría: es que sepas decidir y puedas continuar por tu cuenta.</p></div>
        <ol><li><b>Define</b><span>una idea clara, una audiencia y un formato posible</span></li><li><b>Graba</b><span>con un proceso que cuide audio, voz, cámara y luz</span></li><li><b>Publica</b><span>entendiendo edición, RSS y plataformas como Spotify</span></li></ol>
      </section>
      <section className="seoBand"><small>EN LOCAL RESET · MADRID</small><h2>Aprender dentro de un <b>estudio real</b></h2><p>La masterclass se desarrolla en Local Reset. Ver el equipo y los flujos de trabajo en contexto ayuda a distinguir lo esencial de lo que puede esperar.</p><Link className="textLink" href="/estudio-podcast-madrid">¿Buscas un estudio para tu podcast? →</Link></section>
      <section className="seoFaq"><small>PREGUNTAS FRECUENTES</small><h2>Antes de empezar</h2>{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
    </article>
  </main>;
}
