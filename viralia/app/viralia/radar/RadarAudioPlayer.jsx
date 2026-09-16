"use client";

import { useRef, useState } from "react";

function formatTime(value) {
  const time = Math.max(0, Math.round(Number(value) || 0));
  return `${Math.floor(time / 60)}:${String(time % 60).padStart(2, "0")}`;
}

export default function RadarAudioPlayer({ src, label }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      await audio.play();
    } else {
      audio.pause();
    }
  }

  return (
    <div className="mt-5 flex items-center gap-3 rounded-2xl border border-cyan/20 bg-transparent px-3 py-3 shadow-[0_0_30px_rgba(115,217,255,0.06)]">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? `Pausar ${label}` : `Reproducir ${label}`}
        className="grid size-11 shrink-0 place-items-center rounded-full border border-cyan/70 bg-cyan/10 text-cyan transition hover:scale-105 hover:bg-cyan hover:text-slate-950"
      >
        {playing ? <span className="flex gap-1"><i className="h-3.5 w-0.5 bg-current" /><i className="h-3.5 w-0.5 bg-current" /></span> : <span className="ml-0.5 text-sm">▶</span>}
      </button>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex h-3 items-center gap-0.5 overflow-hidden" aria-hidden="true">
          {Array.from({ length: 42 }, (_, index) => <i key={index} className="radar-wave-bar" style={{ height: `${26 + ((index * 29) % 68)}%`, opacity: currentTime > (duration * index) / 42 ? 1 : 0.38 }} />)}
        </div>
        <input
          aria-label={`Progreso de ${label}`}
          className="radar-audio-progress w-full"
          type="range"
          min="0"
          max={duration || 0}
          step="0.01"
          value={Math.min(currentTime, duration || currentTime)}
          onChange={(event) => {
            const next = Number(event.target.value);
            setCurrentTime(next);
            if (audioRef.current) audioRef.current.currentTime = next;
          }}
        />
      </div>
      <span className="w-20 shrink-0 text-right font-mono text-xs text-mist/65">{formatTime(currentTime)} / {formatTime(duration)}</span>
    </div>
  );
}
