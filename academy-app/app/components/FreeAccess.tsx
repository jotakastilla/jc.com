"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

export function FreeAccess({ children, slug }: { children: React.ReactNode; slug: string }) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  useEffect(() => {
    async function checkAccess() {
      if (localStorage.getItem("local-reset-registration")) {
        setHasAccess(true);
        return;
      }
      if (!supabase || !isSupabaseConfigured) {
        setHasAccess(Boolean(localStorage.getItem("local-reset-registration")));
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      setHasAccess(Boolean(user));
    }
    void checkAccess();
  }, []);
  if (hasAccess === null) return null;
  if (!hasAccess) { const returnTo = `/contenidos/${slug}`; return <section className="accessGate"><small>CONTENIDO FREE</small><h2>Regístrate para<br /><b>seguir leyendo.</b></h2><p>Esta guía es gratuita. Crea tu cuenta para desbloquearla, guardar tus intereses y acceder a los trucos básicos de Academy.</p><Link className="btn" href={`/registro?returnTo=${encodeURIComponent(returnTo)}`}>Crear cuenta gratis →</Link><Link className="textLink" href={`/iniciar-sesion?returnTo=${encodeURIComponent(returnTo)}`}>Ya tengo cuenta · Iniciar sesión →</Link><p className="gateNote">El contenido avanzado y las masterclasses están en Premium.</p></section>; }
  const viewed = JSON.parse(localStorage.getItem("local-reset-viewed") || "[]") as string[];
  if (!viewed.includes(slug)) localStorage.setItem("local-reset-viewed", JSON.stringify([...viewed, slug]));
  return <>{children}</>;
}
