import Link from "next/link";
import { PasswordRecoveryForm } from "../components/PasswordRecoveryForm";

export default function PasswordRecoveryPage() { return <main className="shell"><nav><Link className="brand" href="/">LOCAL RESET <i>ACADEMY</i></Link><span><Link href="/iniciar-sesion">Iniciar sesión</Link><Link href="/registro">Crear perfil</Link></span></nav><section className="registration"><div><small>RECUPERAR ACCESO</small><h1>Crea una<br /><b>contraseña.</b></h1><p>Si abriste tu perfil antes con un enlace, usa este paso una sola vez para poder entrar siempre con usuario y contraseña.</p></div><PasswordRecoveryForm /></section></main>; }
