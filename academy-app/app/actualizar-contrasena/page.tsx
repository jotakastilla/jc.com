import Link from "next/link";
import { UpdatePasswordForm } from "../components/UpdatePasswordForm";

export default function UpdatePasswordPage() { return <main className="shell"><nav><Link className="brand" href="/">LOCAL RESET <i>ACADEMY</i></Link><span><Link href="/iniciar-sesion">Iniciar sesión</Link></span></nav><section className="registration"><div><small>ACCESO ACADEMY</small><h1>Elige tu<br /><b>contraseña.</b></h1><p>Después podrás volver a Academy con tu email y esta contraseña, sin depender de enlaces de acceso.</p></div><UpdatePasswordForm /></section></main>; }
