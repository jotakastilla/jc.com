import Link from "next/link";
import type { Metadata } from "next";
import { RegistrationForm } from "../components/RegistrationForm";

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function RegisterPage() { return <main className="shell"><nav><Link className="brand" href="/">LOCAL RESET <i>ACADEMY</i></Link><span><Link href="/#explorar">Explorar</Link><Link href="/premium">Premium</Link></span></nav><section className="registration"><div><small>ACCESO ANTICIPADO</small><h1>Empieza tu<br /><b>podcast.</b></h1><p>Déjanos tus datos y recibe los contenidos básicos para grabar, editar y publicar con seguridad.</p><ul><li>Guías cortas y prácticas</li><li>Sin conocimientos previos</li><li>Podcast, vídeo, sonido e IA</li></ul></div><RegistrationForm /></section></main>; }
