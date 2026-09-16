"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./VideoPreviews.module.css";

const videos = [["vfeZEGtHmL0", "Preview 01 · Radio"], ["pO9z6yYrVK8", "Preview 02 · Podcast"], ["SGVV3z1dISw", "Preview 03 · Local Reset"]] as const;

export function VideoPreviews() {
  const [activeVideo, setActiveVideo] = useState<(typeof videos)[number] | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);
  function play(video: (typeof videos)[number]) { if (localStorage.getItem("local-reset-registration")) setActiveVideo(video); else setShowRegistration(true); }
  return <section className={styles.section} aria-labelledby="previews-title"><div className={styles.head}><small>ANTES DE EMPEZAR</small><h2 id="previews-title">Así se trabaja<br />en <b>Local Reset.</b></h2><p>Una muestra del estudio, de las conversaciones y de la forma de contar historias que encontrarás dentro de Academy.</p></div><div className={styles.grid}>{videos.map((video) => { const [id, title] = video; return <article className={styles.card} key={id}><button className={styles.motion} onClick={() => play(video)} aria-label={`Reproducir ${title}`} style={{ backgroundImage: `url(https://i.ytimg.com/vi/${id}/maxresdefault.jpg)` }}><span>VISTA PREVIA</span><i>▶</i></button><footer>{title}<span>VER FREE →</span></footer></article>; })}</div>{activeVideo && <div className={styles.modal} role="dialog" aria-modal="true" aria-label={activeVideo[1]}><div className={styles.player}><button className={styles.close} onClick={() => setActiveVideo(null)} aria-label="Cerrar vídeo">×</button><iframe src={`https://www.youtube-nocookie.com/embed/${activeVideo[0]}?autoplay=1&rel=0`} title={activeVideo[1]} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div></div>}{showRegistration && <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Registro necesario"><div className={styles.registration}><button className={styles.close} onClick={() => setShowRegistration(false)} aria-label="Cerrar">×</button><small>CONTENIDO FREE</small><h3>Regístrate para ver el vídeo.</h3><p>La cuenta gratuita te da acceso a todos los trucos, soluciones rápidas y contenidos básicos.</p><Link href="/registro" className="btn">Crear cuenta gratis →</Link></div></div>}</section>;
}
