import Image from "next/image";
import Link from "next/link";
import { lessons } from "@/lib/content";
import styles from "./AcademyPlatform.module.css";

const categories = [
  ["EMPIEZA", "Idea · formato · audiencia · guion"], ["AUDIO", "Micrófonos · grabación · edición · música"], ["VIDEOPODCAST", "Cámaras · planos · luz · producción"], ["EDICIÓN", "DaVinci · CapCut · audio · workflow"], ["CONTENIDO", "Reels · Shorts · hooks · clips"], ["CRECIMIENTO", "Spotify · YouTube · distribución · métricas"], ["IA PARA PODCASTERS", "Investigación · guiones · títulos · herramientas"], ["DENTRO DEL ESTUDIO", "Montajes, clientes y workflows reales"],
] as const;

const featuredGuides = lessons.filter((lesson) => ["empezar-podcast-con-movil", "primer-episodio-podcast", "publicar-podcast-spotify"].includes(lesson.slug));

export function AcademyPlatform() {
  return <>
    <section id="academy" className={styles.outcomes}><div><small>LOCAL RESET ACADEMY</small><h2>De la idea<br />al <b>podcast vivo.</b></h2></div><p>Una plataforma para crear, producir y hacer crecer tu podcast con formación práctica, recursos y el criterio de un estudio que trabaja con proyectos reales.</p><div className={styles.outcomeGrid}>{[["01", "CREA", "Aterriza una idea, encuentra el formato y prepara episodios que tengas ganas de publicar."], ["02", "PRODUCE", "Graba, ilumina, edita y organiza tu flujo con herramientas que puedes usar de verdad."], ["03", "HAZLO CRECER", "Convierte cada episodio en distribución, clips, aprendizaje y una presencia sostenible."]].map(([number, title, copy]) => <article key={title}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>

    <section id="biblioteca" className={styles.library}><div className={styles.sectionHead}><div><small>BIBLIOTECA ACADEMY</small><h2>Encuentra el<br /><b>siguiente paso.</b></h2></div><p>Empieza con contenido abierto y avanza hacia las clases, recursos y herramientas de Academy Premium.</p></div><div className={styles.categoryGrid}>{categories.map(([title, items], index) => <article key={title}><small>{index < 3 ? "EXPLORAR" : "PRÓXIMAMENTE EN PREMIUM"}</small><h3>{title}</h3><p>{items}</p></article>)}</div><div className={styles.guideGrid}>{featuredGuides.map((guide) => <Link key={guide.slug} href={`/contenidos/${guide.slug}`}><small>CONTENIDO ABIERTO</small><b>{guide.title}</b><span>{guide.duration} · Leer guía →</span></Link>)}</div><Link className="btn" href="/areas">Explorar Academy →</Link></section>

    <section id="directos" className={styles.live}><div><small>VIERNES ACADEMY</small><h2>Directos para<br /><b>hacer avanzar</b> tu podcast.</h2><p>Sesiones prácticas sobre producción, edición, contenido, vídeo, audio, crecimiento e IA. La programación se anunciará cuando cada sesión esté confirmada.</p><Link className="textLink" href="/directos">Ver sesiones Academy →</Link></div><aside><small>PRÓXIMO DIRECTO</small><b>Próximamente</b><p>Fecha, tema y ponente por confirmar.</p><span>Las grabaciones estarán disponibles para miembros Premium cuando se publiquen.</span></aside></section>

    <section id="estudio" className={styles.studio}><div className={styles.sectionHead}><div><small>DENTRO DEL ESTUDIO</small><h2>No solo teoría.<br /><b>Así se hace.</b></h2></div><p>Configuraciones, errores, cámaras, micros y workflows que nacen dentro de Local Reset.</p></div><div className={styles.studioGrid}><article><Image src="/images/studio/rodaje-entrevista.png" alt="Cámara preparada para una entrevista en Local Reset" width={900} height={600} /><div><small>DENTRO DEL ESTUDIO</small><h3>Cómo preparamos un set para grabar.</h3><p>Desde los planos y la luz hasta el sonido, antes de que llegue un cliente.</p></div></article><article><Image src="/images/studio/studio-luces.jpg" alt="Iluminación del estudio Local Reset" width={900} height={600} /><div><small>PRÓXIMAMENTE</small><h3>Montajes y casos reales de Local Reset.</h3><p>Una categoría preparada para mostrar procesos reales sin prometer una frecuencia fija.</p></div></article></div></section>

    <section className={styles.tools}><div><small>HERRAMIENTAS Y RECURSOS</small><h2>Menos teoría<br />que <b>no aplicas.</b></h2><p>Plantillas, checklists, prompts y asistentes para avanzar con tu propio proyecto.</p></div><div className={styles.toolCards}><Link href="/validador-idea-podcast"><small>HERRAMIENTA FREE</small><b>Jony · Configurador de podcast</b><span>Valida una idea antes de grabar →</span></Link><Link href="/registro"><small>ACADEMY FREE</small><b>Guarda recursos y tu avance</b><span>Crear cuenta gratis →</span></Link><Link href="/premium"><small>ACADEMY PREMIUM</small><b>Formación y recursos completos</b><span>Conocer Premium →</span></Link></div></section>

    <section className={styles.studioDays}><small>ACADEMY STUDIO DAYS</small><h2>Experiencias<br /><b>en el estudio.</b></h2><p>Jornadas ocasionales con plazas limitadas para grabar, probar equipo, resolver problemas técnicos y mejorar un proyecto acompañado.</p><span>Las próximas experiencias se anunciarán aquí.</span></section>
  </>;
}
