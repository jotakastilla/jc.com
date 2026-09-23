"use client";

import { FormEvent, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

export function PasswordRecoveryForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!supabase || !isSupabaseConfigured) {
      setError("El acceso aún no está configurado. Inténtalo de nuevo en unos minutos.");
      return;
    }
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/actualizar-contrasena` });
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  if (sent) return <div className="registrationSuccess"><small>REVISA TU EMAIL</small><h2>Te enviamos<br />un acceso.</h2><p>Abre el enlace para elegir una contraseña nueva y entrar directamente en tu perfil.</p></div>;
  return <form className="registrationForm" onSubmit={submit}><label>Tu email<input required name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@email.com" autoComplete="email" /></label><p className="privacy">Te enviaremos un enlace seguro para crear una contraseña nueva.</p>{error && <p className="privacy" role="alert">{error}</p>}<button type="submit" disabled={loading}>{loading ? "Enviando…" : "Enviar enlace →"}</button></form>;
}
