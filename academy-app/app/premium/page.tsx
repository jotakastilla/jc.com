import Link from "next/link";
import type { Metadata } from "next";
import { CheckoutButton } from "../components/CheckoutButton";
import { academyConfig } from "@/lib/academy-config";

export const metadata: Metadata = { robots: { index: false, follow: true } };

const plans = [
  { label: "TARIFA GENERAL", price: "390 €", description: "Masterclass presencial + 1 año de Local Reset Academy Premium.", priceId: academyConfig.priceIds.full },
  { label: "TARIFA REDUCIDA", price: "340 €", description: "La misma Masterclass y 1 año de Academy Premium con tarifa reducida.", priceId: academyConfig.priceIds.reduced },
  { label: "RESERVA DE PLAZA", price: "50 €", description: "Reserva tu plaza ahora. El importe se descuenta del pago final.", priceId: academyConfig.priceIds.reservation },
];

export default function PremiumPage() {
  return <main className="shell"><nav><Link className="brand" href="/">LOCAL RESET <i>ACADEMY</i></Link><Link href="/">← Volver</Link></nav><section className="pricing"><small>ACADEMY PREMIUM</small><h1>Aprende, produce<br />y <b>mejora continuamente.</b></h1><p>Premium reunirá la biblioteca completa, recursos descargables, herramientas de Academy y el archivo de sesiones en directo.</p><div className="planGrid"><article><small>MEMBRESÍA PREMIUM</small><h2>19,90 €<sup>/mes</sup></h2><p>Audio, videopodcast, edición, contenido, crecimiento, IA, recursos y formación nacida dentro de un estudio real.</p><button type="button" disabled>Próximamente</button></article><article><small>LO QUE INCLUYE</small><h2>Una Academy viva.</h2><p>El contenido se ampliará de forma continua, sin prometer una cantidad artificial de cursos o recursos cada semana.</p><Link className="btn" href="/registro">Crear cuenta gratis →</Link></article></div></section><section className="pricing"><small>MASTERCLASS PRESENCIAL · MADRID</small><h2>Vive Academy<br /><b>dentro del estudio.</b></h2><p>La Masterclass es una experiencia presencial intensiva e incluye 12 meses de Academy Premium, materiales y ventajas relacionadas con Local Reset.</p><div className="planGrid planGridThree">{plans.map((plan) => <article key={plan.priceId}><small>{plan.label}</small><h2>{plan.price}</h2><p>{plan.description}</p><CheckoutButton priceId={plan.priceId}>Elegir esta opción →</CheckoutButton></article>)}</div><p className="note">Pago seguro procesado por Stripe. Si eliges la reserva, nos pondremos en contacto contigo para completar el importe pendiente.</p></section></main>;
}
