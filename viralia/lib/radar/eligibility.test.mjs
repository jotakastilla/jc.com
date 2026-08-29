import assert from "node:assert/strict";
import test from "node:test";
import { isPublicRadarClip, validateSpokenStatement, validateSpokenText } from "./eligibility.mjs";

const spokenTranscript = {
  words: [
    { word: "Hemos", start: 0, end: 0.3 }, { word: "activado", start: 0.3, end: 0.8 },
    { word: "el", start: 0.8, end: 0.95 }, { word: "plan", start: 0.95, end: 1.2 },
    { word: "de", start: 1.2, end: 1.35 }, { word: "emergencia", start: 1.35, end: 1.9 },
    { word: "para", start: 1.9, end: 2.1 }, { word: "atender", start: 2.1, end: 2.55 },
    { word: "a", start: 2.55, end: 2.65 }, { word: "los", start: 2.65, end: 2.8 },
    { word: "vecinos", start: 2.8, end: 3.3 }, { word: "afectados", start: 3.3, end: 3.9 },
  ],
};

test("acepta una declaración hablada con contenido informativo", () => {
  const verdict = validateSpokenStatement({ transcript: spokenTranscript, selection: { start: 0, end: 3.9 } });
  assert.equal(verdict.eligible, true);
  assert.match(verdict.quote, /plan de emergencia/i);
});

test("rechaza un intervalo sin palabras habladas suficientes", () => {
  const verdict = validateSpokenStatement({ transcript: { words: [{ word: "música", start: 0, end: 0.4 }] }, selection: { start: 0, end: 4 } });
  assert.equal(verdict.eligible, false);
});

test("descarta ambiente, tráfico, motores, música y frases sin valor informativo", () => {
  for (const text of [
    "música ambiente aplausos y ruido de calle durante varios segundos",
    "sonido de motores motos y tráfico en la calle durante la noche",
    "hola gracias vale sí no eh mmm jajaja",
    "la gente está aquí y todo parece muy bien en este momento",
  ]) {
    assert.equal(validateSpokenText(text).eligible, false, text);
  }
});

test("acepta una declaración informativa completa para revisión o publicación", () => {
  const verdict = validateSpokenText("La consejera ha confirmado que el plan de emergencia atenderá hoy a los vecinos afectados por la inundación.");
  assert.equal(verdict.eligible, true);
});

test("no expone en público registros descartados o sin transcripción", () => {
  assert.equal(isPublicRadarClip({ storage_path: "clip.mp3", status: "rejected", transcript: "Hemos activado el plan de emergencia para atender a los vecinos afectados" }), false);
  assert.equal(isPublicRadarClip({ storage_path: "clip.mp3", status: "ready", transcript: "música ambiente", title: "Sonido de motores" }), false);
  assert.equal(isPublicRadarClip({ storage_path: "clip.mp3", status: "ready", transcript: "La consejera ha confirmado que el plan de emergencia atenderá hoy a los vecinos afectados por la inundación.", title: "Sonido de tráfico" }), false);
});
