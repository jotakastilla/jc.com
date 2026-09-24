import Link from "next/link";
import styles from "./AccessGuide.module.css";

const levels = [
  { tag: "CONTENIDO ABIERTO", title: "Explora Academy", copy: "Descubre guías, una selección de recursos y cómo trabajamos antes de crear una cuenta.", action: "Explorar contenido abierto", href: "/areas" },
  { tag: "ACADEMY FREE", title: "Aprende a empezar", copy: "Crea tu perfil para guardar tu avance, acceder a contenido Free y usar las primeras herramientas de Academy.", action: "Crear cuenta gratis", href: "/registro" },
  { tag: "ACADEMY PREMIUM · 19,90 €/MES", title: "Mejora continuamente", copy: "Biblioteca completa, recursos, herramientas y archivo de sesiones en directo. Próximamente disponible.", action: "Conocer Premium", href: "/premium" },
];

export function AccessGuide() {
  return <section className={styles.section} aria-labelledby="access-title"><div className={styles.heading}><small>TRES FORMAS DE ENTRAR</small><h2 id="access-title">Empieza donde<br /><b>estés hoy.</b></h2><p>La parte abierta enseña. Free te acompaña a arrancar. Premium reúne todo lo que necesitas para seguir mejorando.</p></div><div className={styles.levels}>{levels.map((level) => <article key={level.tag}><small>{level.tag}</small><h3>{level.title}</h3><p>{level.copy}</p><Link href={level.href}>{level.action} →</Link></article>)}</div></section>;
}
