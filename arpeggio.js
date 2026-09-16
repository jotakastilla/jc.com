(() => {
  const panel = document.querySelector("[data-arpeggiator]");
  if (!panel) return;

  const voices = {
    pattern: { note: 220, wave: "triangle", color: "#a987df" }, synth: { note: 277.18, wave: "sine", color: "#9eb669" }, memory: { note: 329.63, wave: "triangle", color: "#8392df" }, mixer: { note: 415.3, wave: "sine", color: "#79b490" },
    rad: { note: 146.83, wave: "sawtooth", color: "#b989d6" }, pod: { note: 196, wave: "triangle", color: "#829bdb" }, uni: { note: 293.66, wave: "sine", color: "#b6be75" }, lab: { note: 369.99, wave: "square", color: "#74bca0" },
    audio: { note: 233.08, wave: "sine", color: "#a27cc6" }, podcast: { note: 311.13, wave: "triangle", color: "#798fca" }, studio: { note: 174.61, wave: "sawtooth", color: "#cf966b" }, ia: { note: 466.16, wave: "square", color: "#70c3b5" },
  };
  const selected = new Set(["rad", "pod", "uni", "lab"]);
  let ctx, timer, step = 0;
  const toggle = panel.querySelector("[data-toggle]");
  const buttons = panel.querySelectorAll("[data-voice]");

  function context() {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function play(name, velocity = 0.1) {
    const v = voices[name]; if (!v) return;
    const audio = context(); const now = audio.currentTime;
    const osc = audio.createOscillator(); const gain = audio.createGain(); const filter = audio.createBiquadFilter();
    osc.type = v.wave; osc.frequency.setValueAtTime(v.note, now); osc.frequency.exponentialRampToValueAtTime(v.note * 1.012, now + .15);
    filter.type = "lowpass"; filter.frequency.value = name === "lab" || name === "ia" ? 1800 : 1200;
    gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(velocity, now + .012); gain.gain.exponentialRampToValueAtTime(.0001, now + .28);
    osc.connect(filter).connect(gain).connect(audio.destination); osc.start(now); osc.stop(now + .31);
    const el = panel.querySelector(`[data-voice="${name}"]`); if (el) { el.classList.add("is-playing"); setTimeout(() => el.classList.remove("is-playing"), 260); }
  }
  function tick() { const active = [...selected]; if (!active.length) return; play(active[step++ % active.length], .075); }
  function setPlaying(playing) {
    panel.classList.toggle("is-sequencing", playing); toggle.setAttribute("aria-pressed", String(playing));
    toggle.querySelector("span").textContent = playing ? "■" : "▶"; toggle.querySelector("small").textContent = playing ? "detener arpegio" : "activar arpegio";
    if (timer) { clearInterval(timer); timer = null; } if (playing) { tick(); timer = setInterval(tick, 360); }
  }
  buttons.forEach(button => button.addEventListener("click", () => {
    const name = button.dataset.voice; if (!name) return; context();
    if (selected.has(name)) { selected.delete(name); button.classList.remove("is-active"); button.setAttribute("aria-pressed", "false"); } else { selected.add(name); button.classList.add("is-active"); button.setAttribute("aria-pressed", "true"); play(name, .13); }
  }));
  toggle.addEventListener("click", () => { context(); setPlaying(!timer); });
  ["rad", "pod", "uni", "lab"].forEach(name => { const button = panel.querySelector(`[data-voice="${name}"]`); button?.classList.add("is-active"); button?.setAttribute("aria-pressed", "true"); });
  buttons.forEach(button => { if (!button.hasAttribute("aria-pressed")) button.setAttribute("aria-pressed", "false"); });
})();
