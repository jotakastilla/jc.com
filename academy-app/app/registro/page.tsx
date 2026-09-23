import Link from "next/link";
import type { Metadata } from "next";
import { RegistrationForm } from "../components/RegistrationForm";

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) { const params = await searchParams; const redirectTo = params.returnTo === "/validador-idea-podcast" || params.returnTo?.startsWith("/contenidos/") ? params.returnTo : "/perfil"; return <main className="shell"><nav><Link className="brand" href="/">LOCAL RESET <i>ACADEMY</i></Link><span><Link href="/#explorar">Explorar</Link><Link href="/iniciar-sesion">Iniciar sesión</Link><Link href="/premium">Premium</Link></span></nav><section className="registration"><div><small>ACCESO ANTICIPADO</small><h1>Empieza tu<br /><b>podcast.</b></h1><p>Déjanos tus datos y recibe los contenidos básicos para grabar, editar y publicar con seguridad.</p><ul><li>Guías cortas y prácticas</li><li>Sin conocimientos previos</li><li>Podcast, vídeo, sonido e IA</li></ul></div><RegistrationForm redirectTo={redirectTo} /></section></main>; }
