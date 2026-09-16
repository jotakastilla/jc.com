const fold = (value = "") => String(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

const compact = (value = "") => String(value).replace(/\s+/g, " ").trim();

const PERSONAL_HARM = /\b(fallec|muer[t|te]|muere|perdida|cadaver|accident|atropell|herid|lesion|hospital|enfermedad|desaparec|violencia|asesinat|suicid|incendio|explosion|dies|death|killed|forced marriage|oblig\w* a casarse)\w*/;
const BROAD_EMERGENCY = /\b(emergencia nacional|alerta roja|evacua|catastrof|dana|terremoto|inundacion|gran incendio|incendio forestal|estado de alarma|ume|miles de afectad|corte masivo|pandemia|epidemia|brote|virus|asesinato|atentado)\w*/;
const GOSSIP_OR_MORBO = /\b(reality|cotilleo|novi[oa]|pareja|ruptura|infidelidad|bikini|polemica de redes|que le pasa a|ultimo estado de salud)\b/;
const AMBIGUOUS = /^(que|como|por que|quien|cuando|donde)\b|\bresultado\b/;
const GENERIC_RADAR_QUERY = /^(crypto news|bbc weather|weather|news)$/;
const BETTING_OR_ODDS = /\b(betfair|apuesta|apuestas|cuotas|pronostico|pronósticos|odds)\b/;
const WEATHER_QUERY = /\b(tiempo|aemet|meteorolog|lluvia|temperatura)\b/;
const WEATHER_STOP_WORDS = new Set(["tiempo", "aemet", "meteorologia", "meteorológico", "meteorologica", "prevision", "previsión", "hoy", "mañana", "espana", "españa"]);
const SERIOUS_NORMAL = /\b(ley|ayuda|subvencion|aviso|consumo|empleo|transporte|empresa|economia|tecnologia|inteligencia artificial|ciencia)\b/;
const LIGHT = /\b(musica|cine|serie|television|cultura|festival|meme|viral|internet|curiosidad|juego|deporte|futbol)\b/;
const PUBLIC_FIGURE = /\b(artista|cantante|musico|actor|actriz|director|escritor|presentador|periodista|deportista|figura cultural)\b/;
const MAJOR_AFFAIRS = /\b(eleccion|guerra|invasion|gobierno|presidente|parlamento|congreso|tribunal|sentencia|ley|decreto|economia|inflacion|banco|bolsa|arancel|empleo|huelga|emergencia|alerta roja|evacuacion|terremoto|inundacion|pandemia)\b/;
const STORY_STOP_WORDS = new Set([
  "para", "como", "desde", "sobre", "entre", "tras", "ante", "segun", "esta", "este", "estos", "estas", "hoy", "ahora", "nueva", "nuevo", "nuevos", "nuevas", "ultima", "ultimas", "ultimo", "ultimos", "que", "una", "uno", "unos", "unas", "del", "las", "los", "con", "por", "the", "and", "with", "from", "after", "this", "that", "into", "news", "actualidad", "internet", "contexto", "explicacion", "historia", "noticia", "noticias", "anuncio", "interes", "conversacion", "cambio", "cambia", "crece", "suma", "disponible"
]);

function candidateText(candidate) {
  return fold([
    candidate?.keyword,
    ...(candidate?.newsTitles || []),
    ...(candidate?.relatedSearches || []),
  ].filter(Boolean).join(" "));
}

function hasWeatherLocationMismatch(candidate, text) {
  if (!WEATHER_QUERY.test(text)) return false;
  const locations = fold(candidate?.keyword)
    .match(/[\p{L}]{3,}/gu)
    ?.filter((word) => !WEATHER_STOP_WORDS.has(word)) || [];
  if (!locations.length) return false;
  const headlines = fold((candidate?.newsTitles || []).join(" "));
  return !locations.some((location) => headlines.includes(location));
}

function storyTokens(candidate) {
  return new Set(
    [candidate?.keyword, ...(candidate?.newsTitles || [])]
      .filter(Boolean)
      .join(" ")
      .match(/[\p{L}\p{N}]{4,}/gu)
      ?.map((token) => fold(token))
      .filter((token) => !STORY_STOP_WORDS.has(token)) || []
  );
}

function unique(values = []) {
  return [...new Set(values.map((value) => compact(value)).filter(Boolean))];
}

function belongsToSameStory(candidate, cluster) {
  const keyword = fold(compact(candidate?.keyword));
  const clusterKeywords = cluster.map((item) => fold(compact(item?.keyword)));
  if (clusterKeywords.some((value) => value && (value.includes(keyword) || keyword.includes(value)))) return true;

  const candidateTokens = storyTokens(candidate);
  const clusterTokens = new Set(cluster.flatMap((item) => [...storyTokens(item)]));
  const shared = [...candidateTokens].filter((token) => clusterTokens.has(token));
  return shared.length >= 2;
}

// Google Trends suele repartir la misma noticia en varios términos. Unimos solo
// señales con coincidencias claras para no convertir el episodio en una lista.
export function groupEditorialCandidates(candidates = []) {
  const clusters = [];
  for (const candidate of candidates) {
    const cluster = clusters.find((items) => belongsToSameStory(candidate, items));
    if (cluster) cluster.push(candidate);
    else clusters.push([candidate]);
  }

  return clusters.map((items, index) => {
    const primary = [...items].sort((a, b) =>
      Number(b.trafficScore || 0) - Number(a.trafficScore || 0)
      || (b.newsTitles?.length || 0) - (a.newsTitles?.length || 0)
    )[0];
    return {
      ...primary,
      id: primary.id || `story-${index + 1}`,
      source_keywords: unique(items.map((item) => item.keyword)),
      newsTitles: unique(items.flatMap((item) => item.newsTitles || [])).slice(0, 8),
      sources: unique(items.flatMap((item) => item.sources || [])).slice(0, 6),
      relatedSearches: unique(items.flatMap((item) => item.relatedSearches || [])).slice(0, 8),
      trafficScore: Math.max(...items.map((item) => Number(item.trafficScore || 0)), 0),
      story_signal_count: items.length,
    };
  });
}

function topicCategory(text) {
  if (/\b(ia|inteligencia artificial|tecnologia|app|software|google|openai|empresa|iphone|apple|samsung|galaxy)\b/.test(text)) return "tecnología y empresas";
  if (/\b(futbol|deporte|partido|liga|final|tenis|baloncesto|real madrid)\b/.test(text)) return "deporte";
  if (/\b(once|sorteo|cupon|loteria)\b/.test(text)) return "servicio y consumo";
  if (/\b(musica|cine|serie|television|programacion|telenovela|cultura|festival|libro)\b/.test(text)) return "cultura y entretenimiento";
  if (/\b(meme|viral|internet|redes sociales|tiktok)\b/.test(text)) return "conversación digital";
  return "actualidad y sociedad";
}

function hasReliableContext(candidate) {
  return (candidate?.newsTitles?.length || 0) >= 2 && (candidate?.sources?.length || 0) >= 1;
}

function hasSpecialReach(candidate) {
  return hasReliableContext(candidate)
    && (candidate?.sources?.length || 0) >= 2
    && Number(candidate?.trafficScore || 0) >= 100000;
}

function classifyCandidate(candidate) {
  const text = candidateText(candidate);
  const keyword = compact(candidate?.keyword);

  if (!keyword || AMBIGUOUS.test(fold(keyword)) || GENERIC_RADAR_QUERY.test(fold(keyword)) || ((candidate?.newsTitles?.length || 0) === 0 && keyword.length < 12)) {
    return { classification: "DESCARTAR", reason: "Búsqueda ambigua o sin contexto suficiente para explicarla con rigor." };
  }

  if (BETTING_OR_ODDS.test(text)) {
    return { classification: "DESCARTAR", reason: "Apuestas, cuotas o pronósticos sin valor editorial para el boletín matinal." };
  }

  if (hasWeatherLocationMismatch(candidate, text)) {
    return { classification: "DESCARTAR", reason: "La ubicación de la búsqueda meteorológica no coincide con los titulares disponibles." };
  }

  if (BROAD_EMERGENCY.test(text) && hasSpecialReach(candidate)) {
    return { classification: "ESPECIAL", reason: "Emergencia o acontecimiento de alcance público amplio con contexto periodístico suficiente." };
  }

  if (PERSONAL_HARM.test(text)) {
    const isMajorPublicFigureDeath = PUBLIC_FIGURE.test(text)
      && hasReliableContext(candidate)
      && Number(candidate?.trafficScore || 0) >= 20000;
    if (isMajorPublicFigureDeath) {
      if (hasSpecialReach(candidate)) {
        return {
          classification: "ESPECIAL",
          sensitive: true,
          reason: "Fallecimiento de alta relevancia cultural, confirmado por varias fuentes: merece un especial sobrio.",
        };
      }
      return {
        classification: "NORMAL",
        sensitive: true,
        reason: "Fallecimiento de alta relevancia cultural, confirmado por varias fuentes: merece abrir el boletín con tratamiento sobrio.",
      };
    }
    return { classification: "DESCARTAR", reason: "Daño personal o fallecimiento sin el alcance público confirmado necesario para una pieza especial." };
  }

  if (GOSSIP_OR_MORBO.test(text)) {
    return { classification: "DESCARTAR", reason: "Cotilleo, morbo o interés personal sin una historia editorialmente relevante detrás." };
  }

  if (!hasReliableContext(candidate)) {
    return { classification: "DESCARTAR", reason: "Contexto o fuentes insuficientes: no se puede explicar con seguridad por qué es tendencia." };
  }

  return { classification: "NORMAL", reason: "Tiene contexto verificable y una historia explicable para el boletín habitual." };
}

export function selectSpecialEditorialStory(candidates = []) {
  const classified = groupEditorialCandidates(candidates).map((candidate) => {
    const text = candidateText(candidate);
    const decision = classifyCandidate(candidate);
    return {
      ...candidate,
      classification: decision.classification,
      reason: decision.reason,
      sensitive: Boolean(decision.sensitive),
      category: topicCategory(text),
      temperature: "SERIA",
    };
  });

  const candidate = classified
    .filter((item) => item.classification === "ESPECIAL")
    .sort((a, b) => Number(b.trafficScore || 0) - Number(a.trafficScore || 0))[0];

  if (!candidate) return null;

  return {
    episode_status: "ESPECIAL",
    editorial_theme: candidate.category,
    selected: [{
      ...candidate,
      position: 1,
      editorial_treatment: "ESPECIAL_SOBRIO",
      selection_reason: "Acontecimiento de alcance excepcional confirmado por varias fuentes. Se publica como especial monográfico, sin mezclarlo con tendencias ligeras.",
    }],
    special_candidate: {
      topic: candidate.keyword,
      classification: "ESPECIAL",
      reason: candidate.reason,
      sources: candidate.sources,
      headlines: candidate.newsTitles,
    },
    coherence_score: 95,
    coherence_reason: "Especial monográfico: una sola noticia de gran relevancia, tratada con contexto y tono sobrio.",
  };
}

function scoreNormalCandidate(candidate, text) {
  const parts = [];
  let score = 45;
  if ((candidate?.newsTitles?.length || 0) >= 2) { score += 14; parts.push("varios titulares"); }
  if ((candidate?.sources?.length || 0) >= 2) { score += 10; parts.push("fuentes diversas"); }
  if ((candidate?.relatedSearches?.length || 0) >= 2) { score += 8; parts.push("contexto relacionado"); }
  if (Number(candidate?.trafficScore || 0) >= 100000) { score += 6; parts.push("conversación relevante"); }
  if (/\b(nuevo|nueva|final|estreno|lanza|anuncia|descubre|cambio|historico)\b/.test(text)) { score += 8; parts.push("novedad narrativa"); }
  if (/\b(guia|ayuda|aviso|precio|consumo|empleo|transporte)\b/.test(text)) { score += 5; parts.push("utilidad"); }
  if (MAJOR_AFFAIRS.test(text)) { score += 12; parts.push("relevancia pública"); }
  if ((candidate?.story_signal_count || 1) > 1) { score += 8; parts.push("señales agrupadas de la misma historia"); }
  return { score: Math.min(score, 95), parts };
}

function temperatureFor(text, decision) {
  if (decision?.sensitive) return "SERIA";
  if (SERIOUS_NORMAL.test(text) && !LIGHT.test(text)) return "SERIA";
  if (LIGHT.test(text)) return "LIGERA";
  return "NEUTRA";
}

function editorialTheme(selected) {
  return [...new Set(selected.map((item) => item.category))].slice(0, 4).join(", ");
}

export function selectEditorialStories(candidates = []) {
  const classified = groupEditorialCandidates(candidates).map((candidate) => {
    const text = candidateText(candidate);
    const decision = classifyCandidate(candidate);
    const category = topicCategory(text);
    const temperature = temperatureFor(text, decision);
    const scoring = decision.classification === "NORMAL" ? scoreNormalCandidate(candidate, text) : { score: 0, parts: [] };
    return { ...candidate, classification: decision.classification, reason: decision.reason, sensitive: Boolean(decision.sensitive), category, temperature, editorial_score: scoring.score, score_signals: scoring.parts };
  });

  const special = classified.find((item) => item.classification === "ESPECIAL") || null;
  const normalPool = classified
    .filter((item) => item.classification === "NORMAL")
    .sort((a, b) => Number(b.sensitive) - Number(a.sensitive) || b.editorial_score - a.editorial_score);
  const representedCategories = new Set();
  const selectionOrder = [
    ...normalPool.filter((item) => {
      if (representedCategories.has(item.category)) return false;
      representedCategories.add(item.category);
      return true;
    }),
    ...normalPool.filter((item) => representedCategories.has(item.category)),
  ];

  const selected = [];
  const usedCategories = new Set();
  for (const item of selectionOrder) {
    if (selected.length >= 4) break;
    const duplicate = selected.some((chosen) => fold(chosen.keyword) === fold(item.keyword));
    if (duplicate) continue;
    selected.push({
      ...item,
      position: selected.length + 1,
      editorial_treatment: item.sensitive ? "ABRIR_SOBRIO" : selected.length === 0 ? "HISTORIA_PRINCIPAL" : "BLOQUE_NORMAL",
      editorial_role: selected.length === 0 ? "HISTORIA_PRINCIPAL" : "HISTORIA_SECUNDARIA",
      selection_reason: item.sensitive
        ? "Abre el boletín por su relevancia cultural y requiere una exposición sobria, sin reacciones ligeras ni transición frívola."
        : `Seleccionada por ${item.score_signals.join(", ") || "interés y contexto"}; encaja con la temperatura ${item.temperature.toLowerCase()} del conjunto.`,
    });
    usedCategories.add(item.category);
  }

  // Si hay una historia ligera y apta, reservamos el final solo cuando aporta
  // una idea que merece contarse, sin rebajar el peso de la actualidad previa.
  const lightClosingIndex = selected.map((item) => item.temperature === "LIGERA" && !item.sensitive).lastIndexOf(true);
  if (lightClosingIndex >= 0) {
    const [lightClosingStory] = selected.splice(lightClosingIndex, 1);
    selected.push(lightClosingStory);
    selected.forEach((item, index) => { item.position = index + 1; });
    selected[selected.length - 1] = {
      ...selected[selected.length - 1],
      editorial_treatment: "CIERRE_LIGERO",
      editorial_role: "HISTORIA_PARA_CONTAR",
      selection_reason: "Reserva el cierre con una historia ligera o curiosa para terminar el boletín con una energía amable.",
    };
  }

  if (selected[0]) {
    selected[0] = {
      ...selected[0],
      editorial_role: "HISTORIA_PRINCIPAL",
      editorial_treatment: selected[0].sensitive ? "ABRIR_SOBRIO" : "HISTORIA_PRINCIPAL",
    };
  }
  const digitalStory = selected.find((item) => item.category === "conversación digital" && item.editorial_role !== "HISTORIA_PRINCIPAL");
  if (digitalStory && digitalStory.editorial_role !== "HISTORIA_PARA_CONTAR") {
    digitalStory.editorial_role = "LO_QUE_SE_ESTA_MOVIENDO";
  }

  if (!selected.length) {
    const guardCandidate = classified.find((item) => {
      const text = candidateText(item);
      return item.newsTitles?.length && !PERSONAL_HARM.test(text) && !GOSSIP_OR_MORBO.test(text);
    });
    if (guardCandidate) {
      selected.push({
        ...guardCandidate,
        classification: "NORMAL",
        temperature: "NEUTRA",
        position: 1,
        editorial_treatment: "BLOQUE_NORMAL",
        selection_reason: "Edición de guardia: es la señal con contexto más aprovechable cuando el radar no ofrece un conjunto completo.",
      });
    }
  }

  const status = selected.length >= 3 ? "NORMAL" : selected.length >= 1 ? "NORMAL_REDUCIDO" : "NORMAL_DE_GUARDIA";
  const selectedKeywords = new Set(selected.map((item) => fold(item.keyword)));
  const discarded = classified
    .filter((item) => item.classification === "DESCARTAR" || (item.classification === "NORMAL" && !selectedKeywords.has(fold(item.keyword))))
    .map((item) => ({ topic: item.keyword, classification: "DESCARTAR", reason: item.classification === "NORMAL" ? "Buena candidata, pero queda fuera para mantener un episodio breve y diverso." : item.reason }));

  return {
    episode_status: status,
    editorial_theme: selected.length ? editorialTheme(selected) : "radar del día",
    main_story: selected[0]
      ? { keyword: selected[0].keyword, source_keywords: selected[0].source_keywords || [selected[0].keyword], reason: selected[0].selection_reason }
      : null,
    selected,
    discarded,
    special_candidate: special ? { topic: special.keyword, classification: "ESPECIAL", reason: special.reason, sources: special.sources, headlines: special.newsTitles } : null,
    coherence_score: selected.length ? Math.min(94, 76 + selected.length * 4 + (usedCategories.size >= 3 ? 3 : 0)) : 45,
    coherence_reason: status === "NORMAL"
      ? "Selección ordenada por importancia editorial: las noticias sensibles relevantes abren con sobriedad; el resto cambia de tema mediante una transición neutral."
      : "Edición reducida: se publica con menos temas o con una señal de guardia, sin inventar noticias ni convertir sucesos personales en relleno.",
    candidates: classified.map(({ keyword, classification, reason, sensitive, category, temperature, editorial_score, score_signals, newsTitles, sources, relatedSearches, approxTraffic }) => ({ keyword, classification, reason, sensitive, category, temperature, editorial_score, score_signals, newsTitles, sources, relatedSearches, approxTraffic })),
  };
}
