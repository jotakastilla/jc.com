import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function PremiumPage() {
  return <main className="shell"><nav><Link className="brand" href="/">LOCAL RESET <i>ACADEMY</i></Link><Link href="/">← Volver</Link></nav><section className="pricing"><small>ACCESO PREMIUM · CON TU PLAZA DEL CURSO</small><h1>El material que<br /><b>se queda contigo.</b></h1><p>La Masterclass tendrá un precio de 390 €. Entrar en la lista es gratis y no reserva plaza: cuando confirmemos las fechas te avisaremos por email. Si puedes asistir, podrás pagar 50 € para reservarla. Tras confirmar tu plaza, se activa Premium.</p><div className="planGrid"><article><small>ANTES DE HACER EL CURSO</small><h2>Free</h2><p>Guías abiertas, una selección de contenidos y tu perfil para guardar el avance.</p><Link className="btn" href="/registro">Crear perfil gratis →</Link></article><article><small>CON PLAZA CONFIRMADA</small><h2>Premium</h2><p>El contenido completo del curso y los recursos que irán ampliando Academy.</p><Link className="btn" href="/#proximas">Unirme a la lista →</Link></article></div><p className="note">Premium no es una suscripción aparte: está vinculado a tu plaza confirmada del curso.</p></section></main>;
}
