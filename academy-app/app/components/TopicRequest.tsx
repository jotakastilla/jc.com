"use client";

import { FormEvent, useMemo, useState } from "react";
import styles from "./TopicRequest.module.css";

type WaitlistData = { name: string; email: string };
const initial: WaitlistData = { name: "", email: "" };

export function TopicRequest() {
  const [data, setData] = useState(initial);
  const mailto = useMemo(() => `mailto:info@localreset.com?subject=${encodeURIComponent("Preinscripción Masterclass de octubre")}&body=${encodeURIComponent(`Hola Local Reset,\n\nQuiero solicitar una plaza para la Masterclass de octubre.\n\nNombre: ${data.name}\nEmail: ${data.email}\n\nGracias.`)}`, [data]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.location.href = mailto;
  }

  return <aside className={styles.request}><div><small>EDICIÓN DE OCTUBRE</small><h3>Déjanos tus datos<br />y <b>reserva tu plaza.</b></h3><p>Al enviar, se abrirá un correo de inscripción dirigido a Local Reset. Solo tendrás que confirmarlo para solicitar tu plaza.</p></div><form className={styles.form} onSubmit={submit}><label htmlFor="waitlist-name">Tu nombre<input id="waitlist-name" required value={data.name} onChange={(event) => setData({ ...data, name: event.target.value })} placeholder="Cómo te llamas" /></label><label htmlFor="waitlist-email">Tu email<input id="waitlist-email" required type="email" value={data.email} onChange={(event) => setData({ ...data, email: event.target.value })} placeholder="tu@email.com" /></label><p className={styles.privacy}>Tu solicitud llegará a <b>info@localreset.com</b>.</p><button type="submit">Solicitar mi plaza →</button></form></aside>;
}
