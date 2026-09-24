import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Estudio para grabar podcast en Madrid",
  description: "¿Buscas un estudio de podcast en Madrid? Conoce Local Reset y la formación práctica para preparar tu grabación con criterio.",
  alternates: { canonical: "/estudio-podcast-madrid" },
};

export default function PodcastStudioMadridPage() {
  return <main className="shell"><nav><Link className="brand" href="/">LOCAL RESET <i>ACADEMY</i></Link><span><Link href="/curso-podcast-madrid">Curso de podcast</Link><Link href="/areas">Contenidos</Link></span></nav><article className="seoLanding"><small>ESTUDIO DE PODCAST · MADRID</small><h1>¿Buscas dónde<br /><b>grabar tu podcast?</b></h1><p className="seoLead">Local Reset es un estudio profesional en Madrid. Si además de un espacio quieres entender cómo plantear y sacar adelante tu podcast, Academy te acompaña con formación práctica.</p><div className="actions"><a className="btn" href="https://wa.me/34604864608?text=Hola%20Local%20Reset%2C%20quiero%20hablar%20de%20una%20grabaci%C3%B3n%20de%20podcast." target="_blank" rel="noreferrer">Consultar el estudio →</a><Link className="textLink" href="/curso-podcast-madrid">Ver curso para crear un podcast</Link></div><section className="seoGrid"><div><small>ANTES DE ENCENDER LA CÁMARA</small><h2>Una grabación con <b>base</b></h2><p>El estudio puede resolver el espacio y la técnica. La preparación de la idea, el formato, las preguntas y el uso posterior de cada episodio hacen que una sesión tenga más recorrido.</p></div><ol><li><b>Prepara</b><span>tu concepto, invitados y escaleta</span></li><li><b>Graba</b><span>en un entorno profesional de Local Reset</span></li><li><b>Continúa</b><span>con una estrategia de publicación sostenible</span></li></ol></section><section className="seoBand"><small>LOCAL RESET ACADEMY</small><h2>No solo alquiles un espacio<br /><b>aprende el proceso</b></h2><p>La formación presencial sirve para quienes quieren empezar, mejorar una idea o entender mejor las decisiones de producción antes de grabar.</p><Link className="textLink" href="/curso-podcast-madrid">Conocer la formación de podcast →</Link></section></article></main>;
}
