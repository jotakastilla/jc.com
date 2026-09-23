"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

export function LoginForm({ redirectTo = "/perfil" }: { redirectTo?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (process.env.NODE_ENV === "development" && email.trim() === "jony@local.test" && password === "jony-pruebas") {
      localStorage.setItem("local-reset-registration", JSON.stringify({ name: "Jony · pruebas locales", email: "jony@local.test", createdAt: new Date().toISOString(), localOnly: true }));
      window.location.assign(redirectTo);
      return;
    }
    if (!supabase || !isSupabaseConfigured) {
      setError("El acceso aún no está configurado. Inténtalo de nuevo en unos minutos.");
      return;
    }
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    window.location.assign(redirectTo);
  }

  function localTestUser() { setEmail("jony@local.test"); setPassword("jony-pruebas"); }
  return <form className="registrationForm" onSubmit={submit}><label>Usuario (tu email)<input required name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@email.com" autoComplete="username" /></label><label>Contraseña<input required name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Tu contraseña" autoComplete="current-password" /></label><p className="privacy">Tu navegador puede recordarla y autocompletarla. Academy no guarda contraseñas.</p>{process.env.NODE_ENV === "development" && <button type="button" className="textLink" onClick={localTestUser}>Usar usuario local de pruebas</button>}<Link className="textLink" href="/recuperar-acceso">¿Has olvidado tu contraseña?</Link>{error && <p className="privacy" role="alert">Email o contraseña incorrectos.</p>}<button type="submit" disabled={loading}>{loading ? "Entrando…" : "Iniciar sesión →"}</button></form>;
}
