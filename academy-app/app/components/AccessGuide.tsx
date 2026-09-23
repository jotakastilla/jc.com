import Link from "next/link";
import styles from "./AccessGuide.module.css";

const levels = [
  { tag: "SIN CUENTA", title: "Explora Academy", copy: "Puedes conocer la Masterclass, ver el programa, los testimonios y una selección de guías abiertas.", action: "Ver lo que hay fuera", href: "/#masterclass" },
  { tag: "PERFIL GRATIS", title: "Guarda y aprende", copy: "Con tu perfil accedes a contenidos Free, guardas tu avance y recibes nuevos recursos que se van desbloqueando.", action: "Crear mi perfil", href: "/registro" },
  { tag: "PREMIUM · AL HACER EL CURSO", title: "Todo el material del curso", copy: "Tras confirmar tu plaza tendrás acceso al contenido Premium: materiales de clase, recursos completos y futuras actualizaciones.", action: "Ver acceso Premium", href: "/premium" },
];

export function AccessGuide() {
  return <section className={styles.section} aria-labelledby="access-title"><div className={styles.heading}><small>CÓMO FUNCIONA ACADEMY</small><h2 id="access-title">Lo que está fuera,<br /><b>dentro y en Premium.</b></h2><p>Empieza con recursos abiertos y avanza a tu ritmo hacia la formación que tu podcast necesita.</p></div><div className={styles.levels}>{levels.map((level) => <article key={level.tag}><small>{level.tag}</small><h3>{level.title}</h3><p>{level.copy}</p><Link href={level.href}>{level.action} →</Link></article>)}</div></section>;
}
