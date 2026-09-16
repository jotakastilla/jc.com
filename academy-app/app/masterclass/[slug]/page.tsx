import Link from "next/link";
import type { Metadata } from "next";
import { masterclassModuleBySlug, masterclassModules } from "@/lib/masterclass";
import styles from "./page.module.css";
export function generateStaticParams() { return masterclassModules.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const module = masterclassModuleBySlug((await params).slug);
  if (!module) return {};
  return { title: `${module.title}: curso de podcast en Madrid`, description: module.description, alternates: { canonical: `/masterclass/${module.slug}` } };
}
export default async function ModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const module = masterclassModuleBySlug((await params).slug);
  if (!module) return null;
  const current = masterclassModules.findIndex((item) => item.slug === module.slug);
  const next = masterclassModules[current + 1];

  return <main className="shell"><nav><Link className="brand" href="/">LOCAL RESET <i>ACADEMY</i></Link><Link href="/#masterclass-info">← Masterclass</Link></nav><article className={styles.module}><div className={styles.image} style={{ backgroundImage: `linear-gradient(#080a1080,#080a1040),url('${module.image}')`, backgroundPosition: "center" }} /><small>MÓDULO {module.number} · MASTERCLASS OCTUBRE</small><h1>{module.title}</h1><p className={styles.lead}>{module.description}</p><section className={styles.overview}><small>EN ESTE MÓDULO</small>{module.overview.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section><section className={styles.learning}><small>VAMOS A TRABAJAR</small><ul>{module.points.map((point) => <li key={point}>{point}</li>)}</ul></section><div className={styles.actions}><Link className={styles.back} href="/#masterclass">Volver a la Masterclass</Link>{next && <Link href={`/masterclass/${next.slug}`}>Siguiente módulo: {next.title} →</Link>}</div></article></main>;
}
