"use client";

import Image from "next/image";
import { useRef, useState } from "react";

export default function EpisodeCoverPlay({ audioUrl, coverUrl, title }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
      return;
    }
    audio.pause();
    setIsPlaying(false);
  }

  return (
    <div className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-900">
      <Image src={coverUrl} alt={`Portada de ${title}`} fill sizes="56px" className="object-cover" />
      <div className="absolute inset-0 bg-slate-950/35 transition group-hover:bg-slate-950/50" />
      <button
        type="button"
        onClick={togglePlayback}
        aria-label={isPlaying ? `Pausar ${title}` : `Escuchar ${title}`}
        className="absolute inset-0 grid place-items-center text-white"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-cyan text-slate-950 shadow-lg shadow-slate-950/40">
          {isPlaying ? (
            <span className="flex gap-1"><i className="h-3 w-0.5 bg-current" /><i className="h-3 w-0.5 bg-current" /></span>
          ) : (
            <span className="ml-0.5 h-0 w-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-current" />
          )}
        </span>
      </button>
      <audio ref={audioRef} preload="none" onEnded={() => setIsPlaying(false)}>
        <source src={audioUrl} type="audio/mpeg" />
      </audio>
    </div>
  );
}
