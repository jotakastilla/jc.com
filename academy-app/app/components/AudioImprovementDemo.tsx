"use client";

import { useRef, useState } from "react";
import styles from "./AudioImprovementDemo.module.css";

export function AudioImprovementDemo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  async function toggleSound() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    await video.play();
  }

  return <div className={styles.demo}><video ref={videoRef} className={styles.video} autoPlay loop muted playsInline preload="metadata" aria-label="Vídeo de bienvenida de Local Reset Academy"><source src="/video/local-reset-hero.mp4" type="video/mp4" /></video><div className={styles.overlay} aria-hidden="true" /><button className={styles.mute} onClick={toggleSound} aria-label={muted ? "Activar audio" : "Silenciar vídeo"}>{muted ? "ACTIVAR AUDIO" : "SILENCIAR"}</button></div>;
}
