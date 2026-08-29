"use client";

import { useRef, useState } from "react";

export default function HeroEpisodePlay({ audioUrl, title }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      await audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <audio ref={audioRef} src={audioUrl} preload="metadata" onEnded={() => setIsPlaying(false)} />
      <button
        type="button"
        onClick={togglePlayback}
        aria-label={isPlaying ? `Pausar ${title}` : `Reproducir ${title}`}
        className="group inline-flex items-center gap-3 rounded-full bg-cyan px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-[11px] text-cyan transition group-hover:text-white">
          {isPlaying ? "Ⅱ" : "▶"}
        </span>
        {isPlaying ? "Pausar episodio" : "Escuchar el episodio de hoy"}
      </button>
    </div>
  );
}
