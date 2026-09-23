import Link from "next/link";
import { LoginForm } from "../components/LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const params = await searchParams;
  const redirectTo = params.returnTo === "/validador-idea-podcast" || params.returnTo?.startsWith("/contenidos/") ? params.returnTo : "/perfil";
  return <main className="shell"><nav><Link className="brand" href="/">LOCAL RESET <i>ACADEMY</i></Link><span><Link href="/areas">Guías</Link><Link href="/registro">Crear perfil</Link></span></nav><section className="registration"><div><small>ACCESO ACADEMY</small><h1>Vuelve a<br /><b>tu perfil.</b></h1><p>Entra con el email y la contraseña que creaste al registrarte.</p><ul><li>Acceso a tu material Free</li><li>Progreso y recursos desbloqueados</li><li>Tu email es tu usuario de acceso</li></ul></div><LoginForm redirectTo={redirectTo} /></section></main>;
}
