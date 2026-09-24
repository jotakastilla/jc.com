import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { lessonArea, lessonBySlug, lessons } from "@/lib/content";
import { FreeAccess } from "../../components/FreeAccess";
import styles from "./ContentPage.module.css";
import guideStyles from "./GuideVisuals.module.css";

export function generateStaticParams() { return lessons.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = lessonBySlug((await params).slug);
  if (!lesson) return {};
  return { title: lesson.title, description: lesson.summary, alternates: { canonical: `/contenidos/${lesson.slug}` }, openGraph: { title: lesson.title, description: lesson.summary, type: "article" } };
}
export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const lesson = lessonBySlug((await params).slug);
  if (!lesson) return <main className="shell"><nav><Link className="brand" href="/">LOCAL RESET <i>ACADEMY</i></Link></nav><section className="lesson"><h1>Contenido no encontrado.</h1></section></main>;

  const mobileSetup = lesson.slug === "empezar-podcast-con-movil" && <section className={guideStyles.visualGuide}><small>MONTAJE DE PRUEBA · HABITACIÓN REAL</small><h2>Una habitación sencilla<br />puede sonar y verse <b>mucho mejor.</b></h2><Image src="/images/guides/grabar-podcast-con-movil-habitacion.png" alt="Configuración de una habitación para grabar un podcast con móvil, ventana y elementos que suavizan el sonido" width={1536} height={864} sizes="(max-width: 800px) calc(100vw - 2rem), 850px" priority /><div className={guideStyles.legend}><p><b>1. Ventana</b> Ponte mirándola o a 45 grados; nunca con ella a tu espalda.</p><p><b>2. Móvil</b> A la altura de los ojos y lo bastante cerca para oírte sin forzar la voz.</p><p><b>3. Luz suave</b> Úsala solo si la ventana no basta; evita la luz dura del techo.</p><p><b>4. Fondo</b> Ordenado, con profundidad y pocos objetos que distraigan.</p><p><b>5. Textiles</b> Cortinas, alfombra y sofá reducen el rebote de la habitación.</p></div></section>;
  const episodeMap = lesson.slug === "primer-episodio-podcast" && <section className={guideStyles.episodeMap}><small>ESTRUCTURA BASE · 12 A 18 MINUTOS</small><h2>Tu primer episodio<br />no necesita contarlo <b>todo.</b></h2><div>{[["00:00", "GANCHO", "Una pregunta, escena o problema que haga quedarse."], ["00:30", "PROMESA", "Qué encontrará quien escucha y para quién es."], ["02:00", "UNA HISTORIA", "Un caso o experiencia que demuestre el tono."], ["10:00", "LA IDEA", "Una conclusión útil, clara y concreta."], ["12:00", "SIGUIENTE", "Qué llegará en el próximo episodio y cómo seguirte."]].map(([time, label, text]) => <article key={time}><small>{time}</small><b>{label}</b><p>{text}</p></article>)}</div></section>;
  const related = lessonArea(lesson.slug) === "podcast" && <aside className="accessGate"><small>LOCAL RESET · MADRID</small><h2>¿Quieres aprenderlo<br />en un <b>estudio real?</b></h2><p>Consulta la formación presencial para crear y grabar tu podcast, o conoce Local Reset si buscas un espacio profesional para producirlo.</p><div className="actions"><Link className="btn" href="/curso-podcast-madrid">Ver curso de podcast →</Link><Link className="textLink" href="/estudio-podcast-madrid">Ver estudio en Madrid</Link></div></aside>;
  const guide = <>{lesson.article && <div className={styles.article}>{lesson.article.map((section) => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}</div>}{mobileSetup}{episodeMap}<div className="lessonGrid"><section><h2>Tu primer paso a paso</h2><ol>{lesson.steps.map((step) => <li key={step}>{step}</li>)}</ol></section><aside><small>PARA EMPEZAR</small><h3>Kit mínimo</h3><ul>{lesson.starterKit.map((item) => <li key={item}>{item}</li>)}</ul></aside></div>{related}<Link className="textLink" href="/areas#podcast">← Ver más contenidos</Link></>;

  return <main className="shell"><nav><Link className="brand" href="/">LOCAL RESET <i>ACADEMY</i></Link><span><Link href="/areas#podcast">Explorar</Link><Link href="/perfil">Mi perfil</Link></span></nav><article className="lesson"><small>{lesson.label} · FREE · NIVEL INICIAL · {lesson.duration}</small><h1>{lesson.title}</h1><p className="lessonLead">{lesson.summary}</p>{lesson.isPreview ? guide : <FreeAccess slug={lesson.slug}>{guide}</FreeAccess>}</article></main>;
}
