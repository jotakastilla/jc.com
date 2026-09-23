import Image from "next/image";
import Link from "next/link";
import styles from "./HomePodcastGuide.module.css";

export function HomePodcastGuide() {
  return <aside className={styles.guide} aria-label="Acceso a Jony, el configurador de ideas de podcast">
    <Link href="/validador-idea-podcast" className={styles.bubble}><small>JONY · CONFIGURADOR DE PODCAST · FREE</small><b>Hola, soy Jony.<br />¿Quieres sinceridad o prefieres<br />que te diga que vas a triunfar?</b><span>Hablar con Jony →</span></Link>
    <Link href="/validador-idea-podcast" className={styles.character} aria-label="Hablar con Jony, el configurador de podcast">
      <span className={styles.frames}>
        <Image className={styles.neutral} src="/images/mascots/jony-smile.png" alt="Jony, el configurador de podcast de Local Reset Academy" width={220} height={220} priority />
        <Image className={styles.skeptical} src="/images/mascots/jony-skeptical.png" alt="" width={220} height={220} priority />
      </span>
    </Link>
  </aside>;
}
