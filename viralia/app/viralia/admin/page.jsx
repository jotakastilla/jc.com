import Link from "next/link";
import { formatDuration, formatEpisodeDate, getEpisodes } from "../../../lib/trendcast";
import { requireAdmin } from "../../../lib/admin-auth";
import { deleteEpisodeAction } from "./actions";
import DeleteEpisodeForm from "./DeleteEpisodeForm";
import EpisodeCoverPlay from "./EpisodeCoverPlay";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Viralia admin",
  robots: { index: false, follow: false },
};

export default async function ViraliaAdminPage() {
  await requireAdmin();
  const episodes = await getEpisodes({ includeScheduled: true });

  return (
    <main className="mx-auto max-w-6xl px-6 py-14 text-white lg:px-10">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan/70">Viralia admin</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-white">Episodios</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-mist/65">Biblioteca rápida para publicar, corregir o retirar un episodio sin abrir todo el editor.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/viralia/admin/nuevo" className="rounded-full bg-cyan px-5 py-3 text-sm font-semibold text-slate-950">Crear episodio</Link>
          <Link href="/viralia/radar" className="rounded-full border border-white/10 px-4 py-3 text-sm">Radar de actualidad</Link>
          <Link href="/feed.xml" className="rounded-full border border-white/10 px-4 py-3 text-sm">Preview RSS</Link>
        </div>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/25">
        <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-white/10 px-5 py-3 text-xs uppercase tracking-[0.18em] text-mist/45 md:grid-cols-[minmax(0,1fr)_10rem_8rem]">
          <span>{episodes.length} episodios</span><span className="hidden md:block">Publicación</span><span>Acciones</span>
        </div>
        <div className="divide-y divide-white/10">
          {episodes.map((episode) => (
            <article key={episode.slug} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 md:grid-cols-[minmax(0,1fr)_10rem_8rem] md:px-5">
              <div className="flex min-w-0 items-center gap-4 rounded-2xl transition hover:bg-white/[0.03]">
                <EpisodeCoverPlay audioUrl={episode.audio_url} coverUrl={episode.cover_url} title={episode.title} />
                <Link href={`/viralia/admin/${encodeURIComponent(episode.slug)}`} className="min-w-0"><h2 className="truncate text-sm font-semibold text-white">{episode.title}</h2><p className="mt-1 truncate text-xs text-mist/60">{episode.trend_keyword || "Sin tema"} · {formatDuration(episode.duration)}</p></Link>
              </div>
              <time className="hidden text-xs leading-5 text-mist/60 md:block" dateTime={episode.published_at}>{formatEpisodeDate(episode.published_at)}</time>
              <div className="flex items-center justify-end gap-2"><Link href={`/viralia/admin/${encodeURIComponent(episode.slug)}`} className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-white/85">Abrir</Link><DeleteEpisodeForm slug={episode.slug} title={episode.title} action={deleteEpisodeAction} /></div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
