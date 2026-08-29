function normalize(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function words(value = "") {
  return normalize(value).match(/[a-z0-9]+/g) || [];
}

// Estas etiquetas son señales de que el fichero es ambiente y no una fuente
// sonora. No se usan para vetar una frase que, por ejemplo, hable de motores:
// se aplican junto con una falta de declaración completa.
const NON_EDITORIAL_AUDIO = /\b(musica|aplausos?|ruido|sonido(?:s)?|ambiente|efectos?|trafico|calle|motor(?:es)?|motos?)\b/i;
const AUDIO_ONLY = /^(?:musica|aplausos?|ruido|sonido(?:s)?|ambiente|efectos?|trafico|calle|motor(?:es)?|motos?)(?:\s+(?:musica|aplausos?|ruido|sonido(?:s)?|ambiente|efectos?|trafico|calle|motor(?:es)?|motos?))*[.!? ]*$/i;
const LOW_INFORMATION_SPEECH = /^(hola|buenos dias|buenas tardes|gracias|vamos|vale|si|no|eh|ehm|mmm|aja|jaja)[.!? ]*$/i;
const SPOKEN_STATEMENT_VERB = /\b(?:es|son|sera|seran|ha|han|hemos|he|hay|habra|habran|fue|fueron|dijo|dijeron|afirmo|anuncio|confirmo|explico|informo|comunico|denuncio|pidio|acordo|aprobo|activo|activado|atender|afecta|afectados|permitira|comenzara|sucedio|ocurrio|investiga|detenido|muerto|herido|sube|baja|aumenta|reduce)\b/i;

export function validateSpokenText(value = "") {
  const text = String(value).replace(/\s+/g, " ").trim();
  const selectedWords = words(text);
  if (selectedWords.length < 10) {
    return { eligible: false, reason: "No hay una declaración hablada suficientemente completa." };
  }
  if (LOW_INFORMATION_SPEECH.test(text) || AUDIO_ONLY.test(text)) {
    return { eligible: false, reason: "La intervención no aporta información noticiable." };
  }
  if (new Set(selectedWords).size < 6 || !SPOKEN_STATEMENT_VERB.test(text)) {
    return { eligible: false, reason: "No se reconoce una declaración con un hecho, medida o explicación concreta." };
  }
  return { eligible: true, quote: text };
}

export function textFromSelection(transcript, selection) {
  const timedWords = Array.isArray(transcript?.words) ? transcript.words : [];
  const start = Number(selection?.start);
  const end = Number(selection?.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return "";
  return timedWords
    .filter((word) => Number(word.start) >= start - 0.15 && Number(word.end) <= end + 0.15)
    .map((word) => String(word.word || "").trim())
    .filter(Boolean)
    .join(" ");
}

export function validateSpokenStatement({ transcript, selection }) {
  const duration = Number(selection?.end) - Number(selection?.start);
  if (!Number.isFinite(duration) || duration < 3 || duration > 90) {
    return { eligible: false, reason: "La selección no tiene una duración válida." };
  }

  const selectedText = textFromSelection(transcript, selection);
  const validation = validateSpokenText(selectedText);
  if (!validation.eligible) return validation;
  return { eligible: true, quote: selectedText };
}

export function isPublicRadarClip(clip) {
  if (!clip?.storage_path || !["ready", "approved", "used"].includes(clip.status)) return false;
  const statement = validateSpokenText(clip.transcript);
  if (!statement.eligible) return false;

  // Un registro previo puede conservarse para revisión, pero los que se
  // describían como ambiente o sonido no llegan a la portada pública.
  const metadata = `${clip.title || ""} ${clip.context || ""}`;
  if (NON_EDITORIAL_AUDIO.test(metadata) && !/declaracion validada|aprobado editorialmente/i.test(metadata)) return false;
  return true;
}
