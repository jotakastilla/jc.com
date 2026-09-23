"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { freeArticleSlugs, lessons } from "@/lib/content";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import type { IdeaAnalysis } from "@/lib/podcast-idea";
import styles from "./ProfileDashboard.module.css";
import planStyles from "./ProfilePodcastPlan.module.css";

type Registration = { name: string; email: string; createdAt: string };
const podcastAnalysisKey = "local-reset-podcast-idea-analysis";
const rewards = [
  { month: 1, title: "Plantillas de guion para podcast", type: "PLANTILLA EDITABLE · PODCAST", text: "Ocho estructuras de guion para preparar entrevistas, episodios en solitario, conversaciones, documentales, divulgación, ficción, branded podcast y videopodcast.", file: "/downloads/plantillas-de-guion-para-podcast-academy-free.docx" },
  { month: 2, title: "Plantilla de escenas para Runway", type: "PROMPT · VÍDEO IA", text: "Genera una secuencia vertical de 15 segundos para promocionar un podcast sobre [TEMA]. Divide la historia en tres planos: apertura, detalle y cierre. Mantén estética [ESTILO], movimiento de cámara suave, luz [TIPO DE LUZ] y deja espacio limpio para subtítulos." },
  { month: 3, title: "Checklist para clonar voz con criterio", type: "GUÍA · ELEVENLABS", text: "Antes de clonar una voz, confirma autorización escrita de la persona. Graba 5 a 10 minutos de voz limpia, con diferentes ritmos y emociones. Evita música, eco y terceros. Nombra la muestra, guarda el consentimiento y prueba siempre el resultado con una frase neutra antes de publicarlo." },
  { month: 4, title: "Prompt de limpieza de entrevista", type: "PROMPT · AUDIO IA", text: "Analiza esta entrevista y entrega: 1) una lista de cortes evidentes, 2) frases repetidas que puedo resumir, 3) tres posibles titulares, y 4) una escaleta final. No cambies el sentido de las respuestas ni inventes citas." },
] as const;
const studioGallery = [
  { src: "/images/studio/grabacion-entrevista.png", alt: "Invitada grabando una entrevista en el estudio Local Reset", label: "CONVERSACIONES" },
  { src: "/images/studio/podcast-invitada.jpg", alt: "Invitada con auriculares y micrófono en el estudio", label: "PODCAST" },
  { src: "/images/studio/rodaje-entrevista.png", alt: "Cámara preparada para una entrevista en el estudio", label: "VÍDEO" },
  { src: "/images/studio/rodaje-retrato.png", alt: "Retrato durante una grabación en Local Reset", label: "HISTORIAS" },
  { src: "/images/studio/grabacion-jon.jpg", alt: "Grabación de una sesión de podcast en Local Reset", label: "SESIÓN" },
  { src: "/images/studio/studio-mesas.jpg", alt: "Vista general del set de grabación de Local Reset", label: "EL ESTUDIO" },
  { src: "/images/studio/studio-luces.jpg", alt: "Luces y mesa del set de podcast", label: "DETRÁS DE CÁMARAS" },
] as const;
const upcomingHelp = [
  { label: "VOCOLIA", title: "¿Cómo empiezo a usar Vocolia?" },
  { label: "DAVINCI RESOLVE", title: "Tu primer corte de vídeo sin liarte" },
  { label: "VOCES IA", title: "¿Cómo usar una voz de IA con buen criterio?" },
  { label: "ILUMINACIÓN", title: "Tres retoques para que la luz quede bien" },
  { label: "PROTOOLS", title: "Editar un audio desde cero: lo básico" },
  { label: "AUDIO", title: "¿Por qué mi grabación suena tan baja?" },
  { label: "IDENTIDAD", title: "No me gusta mi cabecera: por dónde empiezo" },
  { label: "MICRÓFONOS", title: "¿Cómo conecto un micrófono al Mac?" },
  { label: "PUBLICACIÓN", title: "¿Dónde publico mi primer episodio?" },
] as const;
function monthsSince(date: string) { const start = new Date(date); const now = new Date(); return Math.max(1, (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth() + 1); }

export function ProfileDashboard() {
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [viewed, setViewed] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [podcastPlan, setPodcastPlan] = useState<IdeaAnalysis | null>(null);
  useEffect(() => {
    setViewed(JSON.parse(localStorage.getItem("local-reset-viewed") || "[]"));
    try { const savedPlan = localStorage.getItem(podcastAnalysisKey); if (savedPlan) setPodcastPlan(JSON.parse(savedPlan) as IdeaAnalysis); } catch { localStorage.removeItem(podcastAnalysisKey); }
    async function loadAccount() {
      if (!supabase || !isSupabaseConfigured) {
        const saved = localStorage.getItem("local-reset-registration");
        if (saved) setRegistration(JSON.parse(saved));
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRegistration(null);
        return;
      }
      const name = typeof user.user_metadata.name === "string" && user.user_metadata.name.trim() ? user.user_metadata.name : user.email?.split("@")[0] || "creador";
      setRegistration({ name, email: user.email || "", createdAt: user.created_at });
    }
    void loadAccount();
  }, []);
  const memberMonth = useMemo(() => registration?.createdAt ? monthsSince(registration.createdAt) : 0, [registration]);
  if (registration === null) return <section className="profileGate"><small>MI PERFIL</small><h1>Tu avance empieza<br /><b>aquí.</b></h1><p>Crea una cuenta para guardar los contenidos que ves y desbloquear recursos originales cada mes.</p><Link className="btn" href="/registro">Crear cuenta gratis →</Link></section>;
  const download = (item: (typeof rewards)[number]) => { if ("file" in item) { window.location.assign(item.file); return; } const file = new Blob([item.text], { type: "text/plain;charset=utf-8" }); const url = URL.createObjectURL(file); const link = document.createElement("a"); link.href = url; link.download = `${item.title.toLowerCase().replaceAll(" ", "-")}.txt`; link.click(); URL.revokeObjectURL(url); };
  const profileLessons = lessons.filter((lesson) => (freeArticleSlugs as readonly string[]).includes(lesson.slug));
  const activeImage = studioGallery[galleryIndex];
  const showPreviousImage = () => setGalleryIndex((current) => (current - 1 + studioGallery.length) % studioGallery.length);
  const showNextImage = () => setGalleryIndex((current) => (current + 1) % studioGallery.length);
  return <section className="profile">
    <div className={styles.profileIntro}><div><small>MI PERFIL · MES {memberMonth}</small><h1>Hola, <b>{registration.name.split(" ")[0]}.</b></h1><p>Este es tu espacio: tus artículos, el progreso que hagas y las herramientas que se irán abriendo en Academy.</p></div></div>
    <div className="profileStats"><span><b>{viewed.length}</b> contenidos vistos</span><span><b>{rewards.filter((item) => item.month <= memberMonth).length}</b> recursos desbloqueados</span></div>
    <section className={planStyles.podcastPlan}><div><small>TU PROYECTO DE PODCAST</small><h2>{podcastPlan ? <>Tu plan está<br /><b>listo para seguir.</b></> : <>Tu idea empieza<br /><b>por una conversación.</b></>}</h2><p>{podcastPlan ? `Tu propuesta: ${podcastPlan.finalProposal}` : "Cuéntanos la idea y prepararemos una primera propuesta, el enfoque y posibles episodios."}</p></div><Link className="btn" href="/validador-idea-podcast">{podcastPlan ? "Abrir mi plan →" : "Empezar mi idea →"}</Link></section>
    <h2>Tu material <b>Free.</b></h2><div className="profileCards">{profileLessons.map((lesson) => <Link href={`/contenidos/${lesson.slug}`} key={lesson.slug}><small>{lesson.label} · FREE</small><b>{lesson.title}</b><span>{viewed.includes(lesson.slug) ? "Volver a leer →" : "Leer artículo →"}</span></Link>)}</div><Link className="textLink" href="/areas">Explorar todas las áreas →</Link>
    <section className={styles.gallery} aria-label="Galería del estudio Local Reset"><div className={styles.copy}><small>LOCAL RESET · POR DENTRO</small><h2>Donde pasan<br />las <b>historias.</b></h2><p>Un lugar real para grabar, conversar, experimentar y convertir una idea en contenido.</p><div className={styles.controls}><button type="button" onClick={showPreviousImage} aria-label="Ver foto anterior">←</button><span>{String(galleryIndex + 1).padStart(2, "0")} <i>/</i> {String(studioGallery.length).padStart(2, "0")}</span><button type="button" onClick={showNextImage} aria-label="Ver foto siguiente">→</button></div></div><div className={styles.visual}><div className={styles.frame}><Image key={activeImage.src} src={activeImage.src} alt={activeImage.alt} fill sizes="(max-width: 800px) calc(100vw - 2rem), 55vw" priority={galleryIndex === 0} /><span>{activeImage.label}</span></div><div className={styles.thumbnails}>{studioGallery.map((image, index) => <button type="button" aria-label={`Ver ${image.label.toLowerCase()}`} aria-pressed={galleryIndex === index} className={galleryIndex === index ? styles.active : ""} onClick={() => setGalleryIndex(index)} key={image.src}><Image src={image.src} alt="" fill sizes="76px" /></button>)}</div></div></section>
    <section className={styles.help} aria-labelledby="help-title"><div className={styles.helpHead}><div><small>PRÓXIMAMENTE EN ACADEMY</small><h2 id="help-title">Las preguntas que<br /><b>todos hacemos.</b></h2></div><p>Píldoras claras y sin tecnicismos para ayudarte cuando estás empezando.</p></div><div className={styles.helpGrid}>{upcomingHelp.map((topic, index) => <article key={topic.title}><small>{String(index + 1).padStart(2, "0")} · {topic.label}</small><b>{topic.title}</b><span><i>⌁</i> PRÓXIMAMENTE</span></article>)}</div></section>
    <div className="rewardsHead"><div><small>RECURSOS ORIGINALES</small><h2>Desbloqueos mensuales</h2></div><p>Se ven desde el primer día, pero solo podrás descargarlos cuando llegue tu mes.</p></div><div className="rewards">{rewards.map((item) => { const unlocked = item.month <= memberMonth; return <article className={unlocked ? "unlocked" : "rewardLocked"} key={item.title}><small>{item.type} · MES {item.month}</small><b>{item.title}</b><p>{unlocked ? "Ya puedes añadirlo a tu carpeta de recursos." : `Disponible en el mes ${item.month}.`}</p><button disabled={!unlocked} onClick={() => download(item)}>{unlocked ? "Descargar recurso ↓" : "BLOQUEADO"}</button></article>; })}</div>
  </section>;
}
