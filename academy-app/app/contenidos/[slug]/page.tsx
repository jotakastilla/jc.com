import Link from "next/link";
import type { Metadata } from "next";
import { lessonBySlug, lessons } from "@/lib/content";
import { FreeAccess } from "../../components/FreeAccess";

export function generateStaticParams() { return lessons.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = lessonBySlug((await params).slug);
  if (!lesson) return {};
  return { title: lesson.title, description: lesson.summary, alternates: { canonical: `/contenidos/${lesson.slug}` }, openGraph: { title: lesson.title, description: lesson.summary, type: "article" } };
}
export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const lesson = lessonBySlug((await params).slug);
  if (!lesson) return <main className="shell"><nav><Link className="brand" href="/">LOCAL RESET <i>ACADEMY</i></Link></nav><section className="lesson"><h1>Contenido no encontrado.</h1></section></main>;

  const guide = <><div className="lessonGrid"><section><h2>Tu primer paso a paso</h2><ol>{lesson.steps.map((step) => <li key={step}>{step}</li>)}</ol></section><aside><small>PARA EMPEZAR</small><h3>Kit mínimo</h3><ul>{lesson.starterKit.map((item) => <li key={item}>{item}</li>)}</ul></aside></div><Link className="textLink" href="/areas#podcast">← Ver más contenidos</Link></>;

  return <main className="shell"><nav><Link className="brand" href="/">LOCAL RESET <i>ACADEMY</i></Link><span><Link href="/areas#podcast">Explorar</Link><Link href="/perfil">Mi perfil</Link></span></nav><article className="lesson"><small>{lesson.label} · FREE · NIVEL INICIAL · {lesson.duration}</small><h1>{lesson.title}</h1><p className="lessonLead">{lesson.summary}</p>{lesson.isPreview ? guide : <FreeAccess slug={lesson.slug}>{guide}</FreeAccess>}</article></main>;
}
