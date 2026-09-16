import styles from "./Footer.module.css";

export function Footer() {
  return <footer className={styles.footer}><a className={styles.brand} href="/">LOCAL RESET <i>ACADEMY</i></a><p>Idea · Vídeo · Audio · Redes · IA aplicada</p><nav><a href="/areas">Guías gratuitas</a><a href="https://wa.me/34604864608" target="_blank" rel="noreferrer">WhatsApp</a><a href="mailto:info@localreset.com">info@localreset.com</a><a href="https://localreset.com" target="_blank" rel="noreferrer">Local Reset Studios</a></nav></footer>;
}
