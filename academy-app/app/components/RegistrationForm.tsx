"use client";

import { FormEvent, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

type FormData = { name: string; email: string; password: string };
type RegistrationFormProps = { source?: "academy" | "masterclass"; redirectTo?: string };
const initial: FormData = { name: "", email: "", password: "" };

export function RegistrationForm({ source = "academy", redirectTo = "/perfil" }: RegistrationFormProps) {
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
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: data.email.trim(),
      password: data.password,
      options: {
        data: { name: data.name.trim(), source, edition: source === "masterclass" ? "OCTUBRE" : undefined },
        emailRedirectTo: `${window.location.origin}${redirectTo}`,
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (signUpData.user?.identities && signUpData.user.identities.length === 0) {
      setError("Ya existe una cuenta con este email. Inicia sesión o crea una contraseña nueva desde «¿Has olvidado tu contraseña?».");
      return;
    }

    localStorage.setItem(
      "local-reset-registration",
      JSON.stringify({ name: data.name, email: data.email, createdAt: new Date().toISOString() }),
    );
    if (signUpData.session) {
      window.location.assign(redirectTo);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return <div className="registrationSuccess"><small>YA ESTÁS EN LA LISTA</small><h2>Gracias, {data.name.split(" ")[0]}.</h2><p>{source === "masterclass" ? "Te avisaremos por email cuando confirmemos las fechas. Si puedes asistir, recibirás el enlace para reservar tu plaza con 50 €. Estar en la lista no tiene coste ni compromiso." : "Te hemos enviado un email para confirmar tu cuenta. Después entrarás con tu email y contraseña."}</p><a className="btn" href={`/iniciar-sesion?returnTo=${encodeURIComponent(redirectTo)}`}>Ir a iniciar sesión →</a></div>;
  }

  return <form className="registrationForm" onSubmit={submit}><label>Tu nombre<input required name="name" value={data.name} onChange={(event) => setData({ ...data, name: event.target.value })} placeholder="Cómo te llamas" autoComplete="name" /></label><label>Tu email (será tu usuario)<input required name="email" type="email" value={data.email} onChange={(event) => setData({ ...data, email: event.target.value })} placeholder="tu@email.com" autoComplete="username" /></label><label>Crea una contraseña<input required name="password" minLength={8} type="password" value={data.password} onChange={(event) => setData({ ...data, password: event.target.value })} placeholder="Mínimo 8 caracteres" autoComplete="new-password" /></label><p className="privacy">Tu navegador puede guardar la contraseña para autocompletarla. Academy no la almacena.</p>{error && <p className="privacy" role="alert">{error}</p>}<button type="submit" disabled={loading}>{loading ? "Creando tu cuenta…" : source === "masterclass" ? "Unirme gratis a la lista →" : "Quiero apuntarme gratis →"}</button></form>;
}
