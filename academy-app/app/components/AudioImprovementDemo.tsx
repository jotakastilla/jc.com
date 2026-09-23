"use client";

import { useEffect, useState } from "react";
import styles from "./AudioImprovementDemo.module.css";

const clips = ["matematico", "entrevista-1", "entrevista-2", "entrevista-3", "entrevista-4"];
const changeDelay = 7000;
const fadeDuration = 1100;

export function AudioImprovementDemo() {
  const [activeClip, setActiveClip] = useState(0);
  const [incomingClip, setIncomingClip] = useState<number | null>(null);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIncomingClip((current) => current ?? (activeClip + 1) % clips.length);
    }, changeDelay);

    return () => window.clearInterval(timer);
  }, [activeClip]);

  useEffect(() => {
    if (!isFading || incomingClip === null) return;

    const timer = window.setTimeout(() => {
      setActiveClip(incomingClip);
      setIncomingClip(null);
      setIsFading(false);
    }, fadeDuration);

    return () => window.clearTimeout(timer);
  }, [incomingClip, isFading]);

  const incomingVideo = incomingClip === null ? null : <video
    key={clips[incomingClip]}
    className={`${styles.video} ${styles.incoming} ${isFading ? styles.visible : ""}`}
    autoPlay
    loop
    muted
    playsInline
    preload="auto"
    aria-label={`Vídeo ${incomingClip + 1} de Local Reset Academy`}
    onPlaying={() => setIsFading(true)}
  >
    <source src={`/video/carrusel/${clips[incomingClip]}.mp4`} type="video/mp4" />
  </video>;

  return <div className={styles.demo}>
    <video className={`${styles.video} ${isFading ? styles.fadingOut : ""}`} autoPlay loop muted playsInline preload="metadata" aria-label={`Vídeo ${activeClip + 1} de Local Reset Academy`}>
      <source src={`/video/carrusel/${clips[activeClip]}.mp4`} type="video/mp4" />
    </video>
    {incomingVideo}
    <div className={styles.overlay} aria-hidden="true" />
  </div>;
}
