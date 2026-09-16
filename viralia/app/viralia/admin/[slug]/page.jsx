import { notFound } from "next/navigation";
import { getEpisodeBySlug } from "../../../../lib/trendcast";
import { requireAdmin } from "../../../../lib/admin-auth";
import EpisodeEditor from "../EpisodeEditor";

export const dynamic = "force-dynamic";

const emptyEpisode = {
  title: "",
  slug: "",
  description: "",
  trend_keyword: "",
  duration: 90,
  published_at: new Date().toISOString(),
  audio_url: "",
  cover_url: "/trendcast/viralia-cover.png",
  transcript: "",
};

export default async function ViraliaAdminEpisodePage({ params }) {
  await requireAdmin();
  const { slug } = await params;
  const isNew = slug === "nuevo";
  const episode = isNew ? emptyEpisode : await getEpisodeBySlug(slug);
  if (!episode) notFound();

  return (
    <main className="mx-auto max-w-4xl px-6 py-14 text-white lg:px-10">
      <p className="text-xs uppercase tracking-[0.3em] text-cyan/70">Viralia admin</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">{isNew ? "Crear episodio" : "Editar episodio"}</h1>
      <p className="mt-3 text-sm leading-6 text-mist/65">{isNew ? "Completa los datos y publícalo cuando esté listo." : "Aquí puedes modificar el contenido completo y volver a publicarlo."}</p>
      <div className="mt-8"><EpisodeEditor episode={episode} isNew={isNew} /></div>
    </main>
  );
}
