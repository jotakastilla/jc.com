"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import styles from "./PodcastIdeaValidator.module.css";

type SpotifyExample = { name: string; publisher: string; url: string };
type Message = { role: "assistant" | "user"; text: string; examples?: SpotifyExample[] };

export function PodcastIdeaValidator() {
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: "Hola, soy Jony. ¿Dudas con tu podcast? Cuéntame qué tienes en mente y vemos si aguanta." }]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [limitReached, setLimitReached] = useState(false);

  async function send() {
    const text = draft.trim();
    if (!text || loading) return;
    if (messages.filter((message) => message.role === "user").length >= 3) {
      setMessages((current) => [...current, { role: "assistant", text: "Hasta aquí puedo orientarte gratis. Para entrar en guion, entrevistas, estructuras, equipo y el resto del método, tendrás que venir a la Masterclass." }]);
      setLimitReached(true);
      return;
    }
    const conversation = [...messages, { role: "user" as const, text }];
    setMessages(conversation);
    setDraft("");
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/jony-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: conversation }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Jony se ha quedado pensando demasiado.");
      setMessages((current) => [...current, { role: "assistant", text: data.reply, examples: Array.isArray(data.examples) ? data.examples : [] }]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No he podido responder. Inténtalo otra vez.");
    } finally { setLoading(false); }
  }

  return <section className={styles.tool}><Mascot /><div className={styles.hero}><small>JONY · CONFIGURADOR DE PODCAST</small><h1>Vamos a ver si tu<br /><b>idea tiene algo que contar</b></h1></div><div className={styles.chat} aria-live="polite">{messages.map((message, index) => <div className={message.role === "assistant" ? styles.assistantTurn : styles.userTurn} key={`${message.role}-${index}`}><p className={message.role === "assistant" ? styles.assistantMessage : styles.userMessage}><MessageText text={message.text} /></p>{message.role === "assistant" && message.examples?.length ? <div className={styles.spotifyExamples}><small>REFERENCIAS EN SPOTIFY</small>{message.examples.map((example) => <a href={example.url} target="_blank" rel="noreferrer" key={example.url}><b>{example.name}</b><span>{example.publisher} · Abrir en Spotify ↗</span></a>)}</div> : null}</div>)}{loading && <p className={`${styles.assistantMessage} ${styles.thinking}`} aria-label="Jony está pensando"><i /><i /><i /></p>}</div>{limitReached ? <section className={styles.freeLimit}><small>HASTA AQUÍ LLEGA JONY FREE</small><h2>El resto del método<br /><b>está en la Masterclass.</b></h2><p>Con tu plaza tienes acceso a Academy durante un año: guiones, estructuras, entrevistas, equipo, edición y todos los recursos para avanzar de verdad.</p><Link className="btn" href="/#proximas">Ver la Masterclass →</Link></section> : <div className={styles.composer}><label htmlFor="podcast-answer">Escribe con tus palabras</label><textarea id="podcast-answer" autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="Tengo una idea para un podcast sobre…" disabled={loading} /><div className={styles.actions}><small>Intro para enviar · Mayús + Intro para nueva línea</small><button type="button" onClick={() => void send()} disabled={!draft.trim() || loading}>Enviar a Jony →</button></div>{error && <p role="alert" className={styles.error}>{error}</p>}</div>}</section>;
}

function MessageText({ text }: { text: string }) {
  const parts = text.split(/(Masterclass)/gi);
  return <>{parts.map((part, index) => part.toLowerCase() === "masterclass" ? <Link className={styles.inlineMasterclass} href="/#proximas" key={index}>Masterclass</Link> : part)}</>;
}

function Mascot() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  return <aside className={styles.mascot} aria-label="Jony, el configurador de podcast. Arrástralo para moverlo." style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }} onPointerDown={(event) => { drag.current = { x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (!drag.current) return; setOffset({ x: drag.current.offsetX + event.clientX - drag.current.x, y: drag.current.offsetY + event.clientY - drag.current.y }); }} onPointerUp={() => { drag.current = null; }}><div className={styles.sprite}><Image className={styles.neutral} src="/images/mascots/jony-smile.png" alt="Jony, el configurador de podcast" width={220} height={220} priority /><Image className={styles.skeptical} src="/images/mascots/jony-skeptical.png" alt="" width={220} height={220} priority /><Image className={styles.wink} src="/images/mascots/jony-wink.png" alt="" width={220} height={220} priority /></div></aside>;
}
