"use client";

import { FormEvent, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

type FormData = { name: string; email: string; interest: string };
const initial: FormData = { name: "", email: "", interest: "" };

export function RegistrationForm() {
  const [data, setData] = useState(initial);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!supabase || !isSupabaseConfigured) {
      setError("El registro aún no está configurado. Inténtalo de nuevo en unos minutos.");
      return;
    }

    setLoading(true);
    const { error: signUpError } = await supabase.auth.signInWithOtp({
      email: data.email.trim(),
      options: {
        data: { name: data.name.trim(), interest: data.interest },
        emailRedirectTo: `${window.location.origin}/perfil`,
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    localStorage.setItem(
      "local-reset-registration",
      JSON.stringify({ ...data, createdAt: new Date().toISOString() }),
    );
    setSent(true);
  }

  if (sent) {
    return <div className="registrationSuccess"><small>REVISA TU EMAIL</small><h2>Gracias, {data.name.split(" ")[0]}.</h2><p>Te hemos enviado un email para confirmar tu cuenta. Cuando lo confirmes, podrás entrar a tu perfil.</p><a className="btn" href="/perfil">Ir a mi perfil →</a></div>;
  }

  return <form className="registrationForm" onSubmit={submit}><label>Tu nombre<input required value={data.name} onChange={(event) => setData({ ...data, name: event.target.value })} placeholder="Cómo te llamas" /></label><label>Tu email<input required type="email" value={data.email} onChange={(event) => setData({ ...data, email: event.target.value })} placeholder="tu@email.com" /></label><label>¿Qué quieres aprender primero?<select value={data.interest} onChange={(event) => setData({ ...data, interest: event.target.value })}><option value="">Elige una opción</option><option>Grabar y editar audio</option><option>Micrófonos y técnica</option><option>IA para podcast</option><option>Vídeo e iluminación</option></select></label><p className="privacy">Usaremos estos datos solo para enviarte novedades de Local Reset Academy. Sin spam.</p>{error && <p className="privacy" role="alert">{error}</p>}<button type="submit" disabled={loading}>{loading ? "Creando tu cuenta…" : "Quiero apuntarme gratis →"}</button></form>;
}
