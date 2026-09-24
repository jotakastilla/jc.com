"use client";

import { useState } from "react";
import styles from "./AcademyIncludesExplainer.module.css";

const items = [
  { label: "Un directo semanal para avanzar con tu podcast", title: "Directo semanal", body: "Una sesión en directo para resolver un paso real del proceso: idea, guion, grabación, audio, vídeo, edición, publicación o crecimiento. Jonathan Castilla guiará las sesiones y, cuando participe alguien invitado, se anunciará junto al tema y la fecha." },
  { label: "12 vídeos de formación iniciales", title: "Los 12 primeros vídeos", body: "Cubrirán el recorrido completo: idea, audiencia, formato, nombre, guion, preparación, micrófonos, grabación de audio, vídeo y luz, edición, publicación y reutilización en contenidos. Cada semana se irán incorporando nuevos vídeos y recursos." },
  { label: "Checklists para preparar, grabar, editar y publicar", title: "Checklists", body: "Listas breves para revisar lo importante antes de cada paso: qué preparar antes de grabar, cómo comprobar el audio, qué exportar y qué revisar antes de publicar." },
  { label: "Prompts, guiones y plantillas de trabajo", title: "Prompts, guiones y plantillas", body: "Material para desbloquear una idea, preparar entrevistas, ordenar un episodio, escribir títulos y descripciones o planificar la publicación sin empezar siempre desde cero." },
  { label: "Música libre de derechos y efectos de sonido", title: "Música y FX", body: "Una selección de música y efectos de sonido pensada para acompañar episodios y piezas de contenido, con indicaciones claras sobre cómo utilizarlos." },
  { label: "Nuevos recursos y contenidos que se incorporen a Academy", title: "Academy seguirá creciendo", body: "Los nuevos directos, vídeos, plantillas y recursos se añadirán de forma progresiva según los problemas reales que vayan apareciendo al crear y publicar podcasts." },
];

export function AcademyIncludesExplainer() {
  const [active, setActive] = useState<number | null>(null);
  const current = active === null ? null : items[active];

  return <><ul className={styles.list}>{items.map((item, index) => <li key={item.title}><button type="button" onClick={() => setActive(index)}>{item.label}<span>Ver más</span></button></li>)}</ul>{current && <div className={styles.backdrop} role="presentation" onMouseDown={() => setActive(null)}><section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="academy-detail-title" onMouseDown={(event) => event.stopPropagation()}><button className={styles.close} type="button" aria-label="Cerrar" onClick={() => setActive(null)}>×</button><small>ACADEMY · QUÉ INCLUYE</small><h3 id="academy-detail-title">{current.title}</h3><p>{current.body}</p><button className={styles.done} type="button" onClick={() => setActive(null)}>Entendido</button></section></div>}</>;
}
