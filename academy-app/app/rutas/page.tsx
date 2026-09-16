import Link from "next/link";
import type { Metadata } from "next";
import { lessonBySlug } from "@/lib/content";

export const metadata: Metadata = { title: "Ruta para crear un podcast desde cero", description: "Ruta de aprendizaje gratuita para pasar de una idea a tu primer podcast.", alternates: { canonical: "/rutas" } };

const creatorRoute = ["tu-podcast-no-va-a-petarlo", "trabajar-audio-sin-agobios", "grabar-audio-y-locucion", "editar-audio", "grabar-video", "ia-para-podcast"];
export default function RoutesPage() { const lessons = creatorRoute.map(lessonBySlug).filter(Boolean); return <main className="shell"><nav><Link className="brand" href="/">LOCAL RESET <i>ACADEMY</i></Link><span><Link href="/areas">Áreas</Link><Link href="/empresas">Empresas</Link><Link href="/perfil">Mi perfil</Link></span></nav><section className="routesPage"><small>RUTAS DE APRENDIZAJE</small><h1>De cero a<br /><b>creador.</b></h1><p>Una ruta con los contenidos que ya están publicados para pasar de una idea a tus primeras piezas de contenido. Iremos ampliándola con estrategia, publicación y distribución.</p><ol className="routeSteps">{lessons.map((lesson, index) => lesson && <li key={lesson.slug}><small>PASO {index + 1}</small><Link href={`/contenidos/${lesson.slug}`}>{lesson.title} <span>→</span></Link></li>)}</ol><div className="routeNote"><small>PRÓXIMAMENTE EN LA RUTA</small><p>Estrategia, publicación, distribución y reutilización. Se mostrarán cuando estén publicados, no como cursos disponibles antes de tiempo.</p></div></section></main>; }
