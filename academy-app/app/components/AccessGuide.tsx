import Link from "next/link";
import styles from "./AccessGuide.module.css";

const levels = [
  { tag: "MASTERCLASS PRESENCIAL · 390 €", title: "Crea tu podcast en el estudio", copy: "Una masterclass práctica en Local Reset para aprender el proceso completo. Incluye 12 meses de acceso a Academy y sus materiales.", action: "Ver la Masterclass", href: "/premium" },
  { tag: "ACADEMY · 19,90 €/MES", title: "Sigue creando", copy: "Acceso a directos, biblioteca completa y todos los materiales de Academy. Además, si quieres venir a la Masterclass, pagas 312 € en vez de 390 €.", note: "20 % de descuento para miembros activos. No se acumula con otras tarifas.", action: "Conocer Academy", href: "/premium" },
  { tag: "ACADEMY FREE · 0 €", title: "Empieza con una muestra", copy: "Algunos vídeos y recursos abiertos para conocer Academy antes de decidir cómo quieres seguir creando.", action: "Ver contenido gratuito", href: "/areas" },
];

export function AccessGuide() {
  return <section className={styles.section} aria-labelledby="access-title"><div className={styles.heading}><small>TRES FORMAS DE ENTRAR</small><h2 id="access-title">Formas de<br /><b>crear</b></h2><p>Elige una sesión presencial para arrancar en el estudio, acceso mensual para seguir avanzando o una pequeña muestra de contenido abierto.</p></div><div className={styles.levels}>{levels.map((level) => <article key={level.tag}><small>{level.tag}</small><h3>{level.title}</h3><p>{level.copy}</p>{level.note && <span className={styles.note}>{level.note}</span>}<Link href={level.href}>{level.action} →</Link></article>)}</div></section>;
}
