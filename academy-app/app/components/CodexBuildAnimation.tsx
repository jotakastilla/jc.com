import styles from "./CodexBuildAnimation.module.css";

export function CodexBuildAnimation() {
  return <article className={styles.terminal} aria-label="Animación de Codex creando Vocolia"><header><span><i /> CODEX · VOCOLIA</span><b>EN PROCESO</b></header><div className={styles.code}><p><em>›</em> Analizando flujo de trabajo…</p><p className={styles.delay1}><em>›</em> Creando <strong>vocolia/app.ts</strong></p><p className={styles.delay2}><em>›</em> Conectando voces, guiones y audio</p><p className={styles.delay3}><em>✓</em> Herramienta lista para el estudio</p><div className={styles.editor}><small>app.ts</small><code><span>export</span> <b>const</b> vocolia = createTool({'{'}<br />&nbsp;&nbsp;voice: <i>true</i>,<br />&nbsp;&nbsp;ideas: <i>true</i>,<br />&nbsp;&nbsp;audio: <i>true</i><br />{'}'});</code></div></div><footer><span>LOCAL RESET / IA APLICADA</span><b>CREANDO HERRAMIENTAS →</b></footer></article>;
}
