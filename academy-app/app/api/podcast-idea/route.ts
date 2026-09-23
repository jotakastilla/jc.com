import { NextRequest, NextResponse } from "next/server";
import { buildFallbackAnalysis, type PodcastAnswers } from "@/lib/podcast-idea";

export async function POST(request: NextRequest) {
  const answers = await request.json() as PodcastAnswers;
  if (!answers.topic || !answers.audience || !answers.purpose) return NextResponse.json({ error: "Faltan las respuestas iniciales." }, { status: 400 });
  const fallback = buildFallbackAnalysis(answers);
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ analysis: fallback, source: "local" });
  try {
    const prompt = `Eres Jony, el configurador de podcast de Local Reset Academy. Responde en español de España. Tu personalidad es directa, escéptica y algo borde, pero nunca humillante: no das por hecho que un proyecto vaya a triunfar y señalas con claridad lo que falta. Tienes criterio sobre nicho, propuesta editorial, estructuras de guion, entrevistas, episodios en solitario, temporadas, formatos de vídeo y audio, frecuencia y producción sostenible. No inventes datos actuales, rankings ni posiciones de podcasts: si se mencionan, indica que requieren una consulta en una fuente de datos actualizada. Tu objetivo es convertir una intuición en decisiones prácticas. Devuelve exclusivamente JSON con estas claves: summary, concreteness (bajo|medio|alto), strength, clarify, reframing, audience, need, sustainability, recommendedFormat, duration, frequency, opportunities (array de 3 claves prácticas), finalProposal y episodes (array de 10 títulos concretos). La propuesta final debe seguir: Este podcast está dirigido a... En cada episodio... para que... Se diferencia... Los títulos no pueden ser categorías genéricas. Datos del usuario: ${JSON.stringify(answers)}`;
    const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify({ model: process.env.OPENAI_PODCAST_MODEL || "gpt-4.1-mini", response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] }) });
    if (!response.ok) throw new Error(`OpenAI ${response.status}`);
    const body = await response.json() as { choices?: { message?: { content?: string } }[] };
    const parsed = JSON.parse(body.choices?.[0]?.message?.content || "{}") as Partial<typeof fallback>;
    if (!parsed.summary || !Array.isArray(parsed.episodes) || parsed.episodes.length !== 10) throw new Error("Respuesta incompleta");
    return NextResponse.json({ analysis: { ...fallback, ...parsed }, source: "openai" });
  } catch {
    // No exponemos detalles internos ni una clave; el diagnóstico básico sigue disponible.
    return NextResponse.json({ analysis: fallback, source: "local" });
  }
}
