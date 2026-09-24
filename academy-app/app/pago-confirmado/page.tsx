import Link from "next/link";

export default function PaymentConfirmedPage() {
  return <main className="shell"><nav><Link className="brand" href="/">LOCAL RESET <i>ACADEMY</i></Link><Link href="/">← Inicio</Link></nav><section className="registration"><div><small>PAGO RECIBIDO</small><h1>Tu plaza está<br /><b>en camino.</b></h1><p>Hemos recibido tu pago. Te enviaremos un email con la confirmación y los siguientes pasos para la Masterclass.</p><p>El acceso a Academy Premium se habilitará con tu plaza confirmada.</p></div><div className="registrationSuccess"><small>GRACIAS POR UNIRTE</small><h2>Nos vemos en el estudio.</h2><p>Guarda el email de confirmación de Stripe. Si has elegido la reserva, te contactaremos para completar el pago pendiente.</p><Link className="btn" href="/">Volver a Academy →</Link></div></section></main>;
}
