"use client";

import { FormEvent, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

export function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => { void (async () => { if (!supabase || !isSupabaseConfigured) return setReady(false); const { data: { user } } = await supabase.auth.getUser(); setReady(Boolean(user)); })(); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!supabase || !isSupabaseConfigured) return;
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) return setError(updateError.message);
    window.location.assign("/perfil");
  }
  if (ready === null) return null;
  if (!ready) return <div className="registrationSuccess"><small>ENLACE CADUCADO</small><h2>Solicita uno<br />nuevo.</h2><p>Por seguridad, los enlaces para establecer una contraseña tienen una duración limitada.</p><a className="btn" href="/recuperar-acceso">Recuperar acceso →</a></div>;
  return <form className="registrationForm" onSubmit={submit}><label>Nueva contraseña<input required name="password" minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 8 caracteres" autoComplete="new-password" /></label><p className="privacy">El navegador puede guardarla para completarla automáticamente la próxima vez.</p>{error && <p className="privacy" role="alert">{error}</p>}<button type="submit" disabled={loading}>{loading ? "Guardando…" : "Guardar y entrar →"}</button></form>;
}
