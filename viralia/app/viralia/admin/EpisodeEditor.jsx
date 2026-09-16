import Link from "next/link";
import { saveEpisodeAction } from "./actions";

export default function EpisodeEditor({ episode, isNew = false }) {
  return (
    <form action={saveEpisodeAction} encType="multipart/form-data" className="glass rounded-[2rem] border border-white/10 p-6 md:p-8">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-mist/70"><span className="mb-2 block">Título</span><input name="title" required defaultValue={episode.title} className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white" /></label>
        <label className="text-sm text-mist/70"><span className="mb-2 block">Slug</span><input name="slug" required={isNew} readOnly={!isNew} defaultValue={episode.slug} className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white read-only:cursor-not-allowed read-only:opacity-60" /></label>
      </div>
      <label className="mt-4 block text-sm text-mist/70"><span className="mb-2 block">Descripción</span><textarea name="description" defaultValue={episode.description} rows={3} className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white" /></label>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <label className="text-sm text-mist/70"><span className="mb-2 block">Keyword</span><input name="trend_keyword" defaultValue={episode.trend_keyword} className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white" /></label>
        <label className="text-sm text-mist/70"><span className="mb-2 block">Duración (segundos)</span><input name="duration" type="number" defaultValue={episode.duration} className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white" /></label>
        <label className="text-sm text-mist/70"><span className="mb-2 block">Fecha de publicación</span><input name="published_at" defaultValue={episode.published_at} className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white" /></label>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm text-mist/70"><span className="mb-2 block">Audio URL</span><input name="audio_url" defaultValue={episode.audio_url} className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white" /></label>
        <label className="text-sm text-mist/70"><span className="mb-2 block">Cover URL</span><input name="cover_url" defaultValue={episode.cover_url} className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white" /></label>
      </div>
      <label className="mt-4 block text-sm text-mist/70"><span className="mb-2 block">Subir audio</span><input name="audio" type="file" accept="audio/*" className="block w-full text-sm text-mist/70" /></label>
      <label className="mt-4 block text-sm text-mist/70"><span className="mb-2 block">Transcripción</span><textarea name="transcript" defaultValue={episode.transcript} rows={10} className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white" /></label>
      <div className="mt-6 flex flex-wrap gap-3"><button type="submit" className="rounded-full bg-cyan px-5 py-3 text-sm font-semibold text-slate-950">Guardar / publicar</button>{!isNew ? <Link href={`/viralia/${episode.slug}`} className="rounded-full border border-white/10 px-5 py-3 text-sm text-white/85">Ver episodio</Link> : null}<Link href="/viralia/admin" className="rounded-full border border-white/10 px-5 py-3 text-sm text-white/85">Volver al listado</Link></div>
    </form>
  );
}
