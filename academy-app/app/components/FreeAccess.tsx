"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function FreeAccess({ children, slug }: { children: React.ReactNode; slug: string }) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  useEffect(() => setHasAccess(Boolean(localStorage.getItem("local-reset-registration"))), []);
  if (hasAccess === null) return null;
  if (!hasAccess) return <section className="accessGate"><small>CONTENIDO FREE</small><h2>Regístrate para<br /><b>seguir leyendo.</b></h2><p>Esta guía es gratuita. Crea tu cuenta para desbloquearla, guardar tus intereses y acceder a los trucos básicos de Academy.</p><Link className="btn" href="/registro">Crear cuenta gratis →</Link><p className="gateNote">El contenido avanzado y las masterclasses están en Premium.</p></section>;
  const viewed = JSON.parse(localStorage.getItem("local-reset-viewed") || "[]") as string[];
  if (!viewed.includes(slug)) localStorage.setItem("local-reset-viewed", JSON.stringify([...viewed, slug]));
  return <>{children}</>;
}
