"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function formatDuration(seconds = 0) {
  const total = Number(seconds) || 0;
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export default function EpisodePlaylist({ episodes }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playRequested, setPlayRequested] = useState(false);
  const audioRef = useRef(null);
  const selected = episodes[selectedIndex] || episodes[0];

  useEffect(() => {
    if (!playRequested || !audioRef.current) return;
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    setPlayRequested(false);
  }, [selectedIndex, playRequested]);

  if (!selected) return null;

  function playEpisode(index) {
    if (index === selectedIndex) {
      togglePlayback();
      return;
    }
    setIsPlaying(false);
    setSelectedIndex(index);
    setPlayRequested(true);
  }

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying || !audio.paused) {
      audio.pause();
      return;
    }
    try {
      await audio.play();
    } catch {
      setIsPlaying(false);
    }
  }

  return (
    <div className="glass rounded-[2rem] border border-white/10 p-5 md:p-7">
      <div className="grid gap-7 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan/70">Playlist</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-white">Últimos episodios</h2>
            </div>
            <span className="text-xs uppercase tracking-[0.18em] text-mist/50">{episodes.length} pistas</span>
          </div>

          <div className="mt-5 max-h-[31rem] space-y-2 overflow-y-auto pr-1">
            {episodes.map((episode, index) => {
              const active = index === selectedIndex;
              return (
                <div
                  key={episode.slug}
                  className={`group flex items-center gap-3 rounded-2xl border p-2 transition ${
                    active ? "border-cyan/45 bg-cyan/[0.09]" : "border-white/10 bg-white/[0.035] hover:border-white/25 hover:bg-white/[0.07]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => playEpisode(index)}
                    aria-label={`Reproducir ${episode.title}`}
                    className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-900"
                  >
                    <Image src={episode.cover_url} alt="" fill sizes="48px" className="object-cover opacity-80" />
                    <span className="absolute inset-0 flex items-center justify-center bg-slate-950/45 text-sm text-white">
                      {active && isPlaying ? "Ⅱ" : "▶"}
                    </span>
                  </button>
                  <Link href={`/viralia/${episode.slug}`} className="min-w-0 flex-1 text-left" aria-label={`Abrir episodio: ${episode.title}`}>
                    <p className={`truncate text-sm font-semibold ${active ? "text-cyan" : "text-white/90"}`}>{episode.title}</p>
                    <p className="mt-1 truncate text-xs text-mist/55">{episode.trend_keyword}</p>
                  </Link>
                  <span className="shrink-0 pr-2 text-xs text-mist/55">{formatDuration(episode.duration)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="rounded-[1.7rem] border border-white/10 bg-slate-950/45 p-4 md:p-5">
          <div className="relative aspect-square overflow-hidden rounded-[1.3rem] bg-slate-900">
            <Image src={selected.cover_url} alt={`Imagen del episodio ${selected.title}`} fill priority sizes="(min-width: 1024px) 32vw, 100vw" className="object-cover" />
          </div>
          <p className="mt-5 text-xs uppercase tracking-[0.23em] text-cyan/70">Ahora suena</p>
          <h3 className="mt-2 text-2xl font-semibold leading-tight tracking-[-0.03em] text-white">{selected.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-mist/62">{selected.description}</p>
          <div className="mt-5 flex items-center gap-3">
            <button type="button" onClick={togglePlayback} className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan text-base text-slate-950 transition hover:bg-white" aria-label={isPlaying ? "Pausar" : "Reproducir"}>
              {isPlaying ? "Ⅱ" : "▶"}
            </button>
            <Link href={`/viralia/${selected.slug}`} className="text-sm font-semibold text-white/80 transition hover:text-cyan">Abrir episodio</Link>
          </div>
          <audio
            key={selected.audio_url}
            ref={audioRef}
            src={selected.audio_url}
            preload="metadata"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
        </aside>
      </div>
    </div>
  );
}
