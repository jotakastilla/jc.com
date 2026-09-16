"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { lessons } from "@/lib/content";

type Registration = { name: string; email: string; createdAt: string };
const rewards = [
  { month: 1, title: "Prompt para tu avatar de podcast", type: "PROMPT · AVATARES", text: "Actúa como director creativo de un podcast. Crea tres conceptos de avatar para [NOMBRE DEL PODCAST], dirigido a [AUDIENCIA]. El tono es [TONO]. Para cada concepto, define encuadre, expresión, vestuario, paleta de color y un prompt final en inglés para un generador de imagen." },
  { month: 2, title: "Plantilla de escenas para Runway", type: "PROMPT · VÍDEO IA", text: "Genera una secuencia vertical de 15 segundos para promocionar un podcast sobre [TEMA]. Divide la historia en tres planos: apertura, detalle y cierre. Mantén estética [ESTILO], movimiento de cámara suave, luz [TIPO DE LUZ] y deja espacio limpio para subtítulos." },
  { month: 3, title: "Checklist para clonar voz con criterio", type: "GUÍA · ELEVENLABS", text: "Antes de clonar una voz, confirma autorización escrita de la persona. Graba 5 a 10 minutos de voz limpia, con diferentes ritmos y emociones. Evita música, eco y terceros. Nombra la muestra, guarda el consentimiento y prueba siempre el resultado con una frase neutra antes de publicarlo." },
  { month: 4, title: "Prompt de limpieza de entrevista", type: "PROMPT · AUDIO IA", text: "Analiza esta entrevista y entrega: 1) una lista de cortes evidentes, 2) frases repetidas que puedo resumir, 3) tres posibles titulares, y 4) una escaleta final. No cambies el sentido de las respuestas ni inventes citas." },
] as const;

function monthsSince(date: string) { const start = new Date(date); const now = new Date(); return Math.max(1, (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth() + 1); }

export function ProfileDashboard() {
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [viewed, setViewed] = useState<string[]>([]);
  useEffect(() => { const saved = localStorage.getItem("local-reset-registration"); if (saved) setRegistration(JSON.parse(saved)); setViewed(JSON.parse(localStorage.getItem("local-reset-viewed") || "[]")); }, []);
  const memberMonth = useMemo(() => registration?.createdAt ? monthsSince(registration.createdAt) : 0, [registration]);
  if (registration === null) return <section className="profileGate"><small>MI PERFIL</small><h1>Tu avance empieza<br /><b>aquí.</b></h1><p>Crea una cuenta para guardar los contenidos que ves y desbloquear recursos originales cada mes.</p><Link className="btn" href="/registro">Crear cuenta gratis →</Link></section>;
  const download = (item: (typeof rewards)[number]) => { const file = new Blob([item.text], { type: "text/plain;charset=utf-8" }); const url = URL.createObjectURL(file); const link = document.createElement("a"); link.href = url; link.download = `${item.title.toLowerCase().replaceAll(" ", "-")}.txt`; link.click(); URL.revokeObjectURL(url); };
  return <section className="profile"><small>MI PERFIL · MES {memberMonth}</small><h1>Hola, <b>{registration.name.split(" ")[0]}.</b></h1><p>Este es tu espacio: lo que ya has visto y las herramientas que se irán abriendo mientras sigas en Academy.</p><div className="profileStats"><span><b>{viewed.length}</b> contenidos vistos</span><span><b>{rewards.filter((item) => item.month <= memberMonth).length}</b> recursos desbloqueados</span></div><h2>Continúa aprendiendo</h2><div className="profileCards">{viewed.length ? viewed.map((slug) => { const lesson = lessons.find((item) => item.slug === slug); return lesson ? <Link href={`/contenidos/${lesson.slug}`} key={slug}><small>{lesson.label}</small><b>{lesson.title}</b><span>Volver a ver →</span></Link> : null; }) : <p className="empty">Todavía no has abierto ningún contenido. Empieza por las guías Free.</p>}</div><div className="rewardsHead"><div><small>RECURSOS ORIGINALES</small><h2>Desbloqueos mensuales</h2></div><p>Se ven desde el primer día, pero solo podrás descargarlos cuando llegue tu mes.</p></div><div className="rewards">{rewards.map((item) => { const unlocked = item.month <= memberMonth; return <article className={unlocked ? "unlocked" : "rewardLocked"} key={item.title}><small>{item.type} · MES {item.month}</small><b>{item.title}</b><p>{unlocked ? "Ya puedes añadirlo a tu carpeta de recursos." : `Disponible en el mes ${item.month}.`}</p><button disabled={!unlocked} onClick={() => download(item)}>{unlocked ? "Descargar recurso ↓" : "BLOQUEADO"}</button></article>; })}</div></section>;
}
