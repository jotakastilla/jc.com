import assert from "node:assert/strict";
import test from "node:test";
import { groupEditorialCandidates, selectEditorialStories, selectSpecialEditorialStory } from "./viralia-editorial.mjs";
import { buildEditorialFallbackConversation } from "./generate-viralia-episode.mjs";

const trend = (keyword, titles, sources = ["Medio A", "Medio B"], extra = {}) => ({ keyword, newsTitles: titles, sources, relatedSearches: ["contexto", "explicación"], trafficScore: 150000, ...extra });

test("A: el fallecimiento de una personalidad muy relevante abre el episodio con sobriedad", () => {
  const result = selectEditorialStories([
    trend("Fallecimiento de artista", ["Muere un artista conocido", "Reacciones tras la muerte"], ["Medio A", "Medio B"], { trafficScore: 50000 }),
    trend("Nueva IA", ["Una empresa presenta nueva IA", "La herramienta cambia el sector"]),
    trend("Final de fútbol", ["La final decide el título", "El partido concentra atención"]),
    trend("Curiosidad cultural", ["Un museo recupera una obra", "La historia se hace viral"]),
  ]);
  assert.equal(result.episode_status, "NORMAL");
  assert.equal(result.selected[0].keyword, "Fallecimiento de artista");
  assert.equal(result.selected[0].editorial_treatment, "ABRIR_SOBRIO");
});

test("B: una emergencia nacional es especial y no se mezcla", () => {
  const result = selectEditorialStories([
    trend("Emergencia nacional", ["Alerta roja y evacuaciones", "Miles de afectados por la emergencia"]),
    trend("Meme viral", ["El meme que circula hoy", "Las redes lo convierten en tendencia"]),
    trend("Televisión", ["Un estreno lidera la noche", "La audiencia comenta el programa"]),
    trend("Final deportiva", ["Una final esperada", "El deporte concentra conversación"]),
  ]);
  assert.equal(result.special_candidate?.topic, "Emergencia nacional");
  assert.equal(result.selected.some((item) => item.keyword === "Emergencia nacional"), false);
});

test("C: varias historias compatibles forman un normal diverso", () => {
  const result = selectEditorialStories([
    trend("Nueva tecnología", ["Nueva tecnología disponible", "El anuncio despierta interés"]),
    trend("Fenómeno musical", ["Una canción conquista internet", "El fenómeno suma escuchas"]),
    trend("Final deportiva", ["La final llega hoy", "El partido centra la jornada"]),
    trend("Tendencia social", ["Un comportamiento se vuelve viral", "La conversación crece en redes"]),
  ]);
  assert.equal(result.episode_status, "NORMAL");
  assert.equal(result.selected.length, 4);
});

test("D: un radar de accidentes, rumores y cotilleo activa edición de guardia", () => {
  const result = selectEditorialStories([
    trend("Accidente menor", ["Un herido tras un accidente", "El caso despierta curiosidad"]),
    trend("Rumor de famoso", ["Rumor sobre una pareja", "Las redes especulan"]),
    trend("Qué pasa", [], []),
    trend("Cotilleo reality", ["Un reality habla de una ruptura", "La pareja genera comentarios"]),
  ]);
  assert.equal(result.episode_status, "NORMAL_DE_GUARDIA");
  assert.equal(result.selected.length, 0);
});

test("E: entre seis buenas conserva las historias interesantes y reserva una ligera para cerrar", () => {
  const result = selectEditorialStories([
    trend("Nueva IA", ["Nueva IA para usuarios", "El lanzamiento abre debate"]),
    trend("Estreno de cine", ["Un estreno sorprende", "La película genera conversación"]),
    trend("Final de fútbol", ["La final se acerca", "El partido marca el día"]),
    trend("Meme digital", ["Un meme se vuelve viral", "Internet reacciona"]),
    trend("Ciencia espacial", ["Un hallazgo científico", "La misión aporta datos"]),
    trend("Nueva aplicación", ["Una app presenta funciones", "El cambio interesa a usuarios"]),
  ]);
  assert.equal(result.selected.length, 6);
  assert.equal(result.selected.at(-1).editorial_treatment, "CIERRE_LIGERO");
  assert.equal(result.discarded.length, 0);
});

test("F: agrupa términos diferentes que describen la misma historia", () => {
  const grouped = groupEditorialCandidates([
    trend("Temporal en Ibiza", ["Alerta por tormentas en Ibiza", "El temporal obliga a extremar precauciones"]),
    trend("Tiempo en Ibiza", ["Tormentas en Ibiza durante la madrugada", "Alerta meteorológica en la isla"]),
    trend("Nueva IA", ["Una empresa presenta nueva IA", "La herramienta cambia el sector"]),
  ]);
  assert.equal(grouped.length, 2);
  const ibiza = grouped.find((item) => item.source_keywords.includes("Temporal en Ibiza"));
  assert.equal(ibiza.source_keywords.length, 2);
});

test("G: con solo dos historias válidas publica una edición reducida", () => {
  const result = selectEditorialStories([
    trend("Nueva tecnología", ["Nueva tecnología disponible", "El anuncio despierta interés"]),
    trend("Fenómeno musical", ["Una canción conquista internet", "El fenómeno suma escuchas"]),
    trend("Accidente menor", ["Un herido tras un accidente", "El caso despierta curiosidad"]),
  ]);
  assert.equal(result.episode_status, "NORMAL_REDUCIDO");
  assert.equal(result.selected.length, 2);
});

test("H: un suceso excepcional confirmado activa un especial monográfico", () => {
  const result = selectSpecialEditorialStory([
    trend("Alerta roja por inundaciones", ["Evacuaciones tras la alerta roja", "Miles de afectados por las inundaciones"], ["Medio A", "Medio B"], { trafficScore: 250000 }),
    trend("Estreno de cine", ["Un estreno sorprende", "La película genera conversación"]),
  ]);
  assert.equal(result?.episode_status, "ESPECIAL");
  assert.equal(result?.selected.length, 1);
  assert.equal(result?.selected[0].editorial_treatment, "ESPECIAL_SOBRIO");
});

test("I: un incidente sin alcance suficiente no dispara un especial", () => {
  const result = selectSpecialEditorialStory([
    trend("Incendio local", ["Controlado un incendio", "Los bomberos trabajan en la zona"], ["Medio A"], { trafficScore: 10000 }),
  ]);
  assert.equal(result, null);
});

test("J: un fallo del guion IA tiene una salida editorial publicable", () => {
  const result = buildEditorialFallbackConversation({
    selected: [
      { keyword: "Alerta meteorológica", newsTitles: ["Lluvias previstas en varias zonas"], temperature: "SERIA" },
      { keyword: "Estreno cultural", newsTitles: ["Una película concentra conversación"], temperature: "LIGERA", editorial_treatment: "CIERRE_LIGERO" },
    ],
  }, { reason: "Respuesta de IA no válida" });
  assert.equal(result.fallback, true);
  assert.equal(result.blocks.length, 2);
  assert.match(result.fullText, /Alerta meteorológica/);
  assert.match(result.fullText, /Estreno cultural/);
});

test("K: descarta tiempo de una ciudad cuando los titulares hablan de otra", () => {
  const result = selectEditorialStories([
    trend("tiempo madrid", ["Previsión de AEMET para Córdoba", "Córdoba baja sus temperaturas"]),
    trend("Nueva tecnología", ["Nueva tecnología disponible", "El anuncio despierta interés"]),
  ]);
  assert.equal(result.selected.some((item) => item.keyword === "tiempo madrid"), false);
});

test("L: descarta cuotas y casas de apuestas", () => {
  const result = selectEditorialStories([
    trend("betfair", ["Pronóstico y cuotas para el partido", "Crear apuesta para la jornada"]),
    trend("Nueva tecnología", ["Nueva tecnología disponible", "El anuncio despierta interés"]),
  ]);
  assert.equal(result.selected.some((item) => item.keyword === "betfair"), false);
});
