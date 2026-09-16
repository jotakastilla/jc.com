import { getRadarClips } from "../../../lib/radar/server";
import { searchYouTubeOriginalSources } from "../../../lib/radar/youtube";
import RadarAudioPlayer from "./RadarAudioPlayer";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Radar de actualidad | Noticias y tendencias",
  description: "Lo más buscado y relevante de internet, reunido para escucharlo con contexto.",
};

function statusLabel(clip) {
  if (clip.playback_url) return clip.status === "used" ? "Ya emitido" : "Audio listo";
  if (clip.youtube_video_id) return "Fuente reproducible";
  return "Extrayendo audio";
}

function seconds(value) {
  const total = Math.round(Number(value) || 0);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function normalizeSearchText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function matchesKeywords(clip, query) {
  const keywords = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  if (!keywords.length) return true;
  const searchableText = normalizeSearchText([
    clip.title,
    clip.speaker,
    clip.topic,
    clip.transcript,
    clip.context,
  ].filter(Boolean).join(" "));
  return keywords.every((keyword) => searchableText.includes(keyword));
}

export default async function ViraliaRadarPage({ searchParams }) {
  const clips = await getRadarClips({ playableOnly: true, displayLimit: 12 });
  const params = await searchParams;
  const keywordQuery = String(params?.q || "").trim();
  const sourceQuery = String(params?.source || "").trim();
  const filteredClips = clips.filter((clip) => matchesKeywords(clip, keywordQuery));
  const youtube = await searchYouTubeOriginalSources(sourceQuery);
  return (
    <main className="mx-auto max-w-6xl px-6 py-14 text-white lg:px-10">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan/70">Señales del momento</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">Radar de actualidad</h1>
          <p className="mt-3 max-w-2xl text-mist/70">Lo más buscado y relevante de internet, reunido para que entres, explores y escuches las voces detrás de cada tema.</p>
        </div>
      </div>

      <section className="space-y-4">
        <form action="/viralia/radar" className="glass rounded-3xl border border-white/10 p-4 md:p-5">
          <label htmlFor="radar-keywords" className="text-xs uppercase tracking-[0.25em] text-cyan/70">Busca en el radar</label>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              id="radar-keywords"
              name="q"
              defaultValue={keywordQuery}
              className="min-w-[15rem] flex-1 rounded-full border border-white/10 bg-slate-950/50 px-4 py-2.5 text-sm text-white"
              placeholder="Palabras clave, tema o persona"
            />
            <button className="rounded-full border border-cyan/40 bg-cyan/10 px-5 py-2.5 text-sm font-medium text-cyan transition hover:bg-cyan hover:text-slate-950">Filtrar audios</button>
            {keywordQuery ? <a href="/viralia/radar" className="px-2 text-sm text-mist/70 transition hover:text-white">Limpiar</a> : null}
          </div>
          <p className="mt-3 text-sm text-mist/60">Introduce una o varias palabras para encontrar audios y temas relacionados.</p>
        </form>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-cyan/70">Para escuchar ahora</p>
            <h2 className="mt-2 text-2xl font-semibold">Voces y señales que están dando que hablar</h2>
          </div>
          <span className="text-sm text-mist/60">{keywordQuery ? `${filteredClips.length} resultados` : `${filteredClips.length} para escuchar`}</span>
        </div>
        {filteredClips.length ? <div className="grid gap-4 lg:grid-cols-2">{filteredClips.map((clip) => <article key={clip.id} className="glass rounded-3xl border border-white/10 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.2em] text-cyan/75">{statusLabel(clip)}</p><h2 className="mt-2 text-xl font-medium">{clip.title}</h2><p className="mt-1 text-sm text-mist/70">{clip.speaker || "Sin persona"} · {clip.topic} · {clip.playback_url ? seconds(Number(clip.end_time) - Number(clip.start_time)) : clip.youtube_video_id ? "vídeo fuente" : "procesando"}</p></div><a href={clip.source_url} target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/85">Ver fuente</a></div>
          <RadarAudioPlayer src={clip.playback_url} label={clip.title} />
          {clip.transcript ? <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-mist/75">{clip.transcript}</p> : null}
        </article>)}</div> : keywordQuery ? <p className="rounded-3xl border border-dashed border-white/15 p-8 text-mist/60">No hay audios ni temas que coincidan con “{keywordQuery}”. Prueba con otra palabra o limpia la búsqueda.</p> : <p className="rounded-3xl border border-dashed border-white/15 p-8 text-mist/60">Estamos reuniendo nuevas voces y temas. Vuelve pronto para escuchar la próxima selección.</p>}
      </section>

      <section className="mt-10 border-t border-white/10 pt-6">
        <form className="flex flex-wrap items-center gap-3" action="/viralia/radar">
          <label className="sr-only" htmlFor="radar-search">Buscar fuentes</label>
          <input id="radar-search" name="source" defaultValue={sourceQuery} className="min-w-[15rem] flex-1 rounded-full border border-white/10 bg-slate-950/50 px-4 py-2.5 text-sm text-white" placeholder="Buscar persona, declaración o tema" />
          <button className="rounded-full border border-cyan/40 bg-cyan/10 px-4 py-2.5 text-sm font-medium text-cyan hover:bg-cyan hover:text-slate-950">Buscar en YouTube</button>
        </form>
        {!youtube.available ? <p className="mt-3 text-sm text-mist/70">La búsqueda de fuentes no está disponible temporalmente.</p> : null}
        {sourceQuery && youtube.available && !youtube.results.length ? <p className="mt-4 text-sm text-mist/60">No hay fuentes para esa búsqueda.</p> : null}
        {youtube.results.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{youtube.results.map((video) => <a key={video.videoId} href={video.url} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-cyan/50"><p className="text-xs uppercase tracking-[0.15em] text-cyan/75">{video.channel || "YouTube"}</p><h2 className="mt-2 font-medium">{video.title}</h2><p className="mt-2 line-clamp-2 text-sm text-mist/65">{video.description}</p></a>)}</div> : null}
      </section>
    </main>
  );
}
