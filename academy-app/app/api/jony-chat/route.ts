import { NextRequest, NextResponse } from "next/server";

type Message = { role: "assistant" | "user"; text: string };
type SpotifyShow = { name: string; publisher: string; url: string };

let spotifyToken: { value: string; expiresAt: number } | null = null;

async function spotifyExamples(messages: Message[]): Promise<SpotifyShow[]> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const query = messages.filter((message) => message.role === "user").at(-1)?.text.trim();
  if (!clientId || !clientSecret || !query) return [];

  try {
    if (!spotifyToken || spotifyToken.expiresAt < Date.now()) {
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: "grant_type=client_credentials",
      });
      if (!tokenResponse.ok) return [];
      const token = await tokenResponse.json() as { access_token?: string; expires_in?: number };
      if (!token.access_token) return [];
      spotifyToken = { value: token.access_token, expiresAt: Date.now() + Math.max((token.expires_in ?? 3600) - 60, 60) * 1000 };
    }

    const search = new URL("https://api.spotify.com/v1/search");
    search.searchParams.set("q", query.slice(0, 120));
    search.searchParams.set("type", "show");
    search.searchParams.set("market", "ES");
    search.searchParams.set("limit", "3");
    const response = await fetch(search, { headers: { Authorization: `Bearer ${spotifyToken.value}` } });
    if (!response.ok) return [];
    const data = await response.json() as { shows?: { items?: { name?: string; publisher?: string; external_urls?: { spotify?: string } }[] } };
    return (data.shows?.items ?? []).flatMap((show) => show.name && show.external_urls?.spotify ? [{ name: show.name, publisher: show.publisher || "Spotify", url: show.external_urls.spotify }] : []);
  } catch { return []; }
}

const fallbackQuestions = [
  "Vale. ¿Para quién es exactamente? «Para todo el mundo» no vale: nadie escucha un podcast pensado para nadie.",
  "¿Qué problema, curiosidad o momento concreto va a resolver para esa persona?",
  "¿Por qué tú puedes contar esto y qué no encontrarían igual en otros podcasts?",
  "¿Qué formato y frecuencia podrías mantener sin abandonar en el cuarto episodio?",
];

function fallback(messages: Message[]) {
  const replies = messages.filter((message) => message.role === "user");
  if (replies.length <= fallbackQuestions.length) return { reply: fallbackQuestions[replies.length - 1] };
  const [topic = "tu tema", audience = "tu audiencia", purpose = "ayudar a la gente", experience = "tu experiencia", schedule = "la frecuencia que has planteado"] = replies.map((message) => message.text);
  if (replies.length === 5) return { reply: `Bien, ahora sí hay una base. Un podcast sobre ${topic}, para ${audience}, con el objetivo de ${purpose}, tiene una promesa reconocible. Tu experiencia (${experience}) es el motivo para escucharte y ${schedule} puede ser sostenible si cada episodio tiene una estructura repetible. Mi consejo: alterna una guía muy concreta de cuidado con una historia o problema real de una planta. ¿Qué tipo de flores o situaciones quieres dominar primero?` };
  return { reply: "No necesito seguir dándote vueltas con la misma pregunta. Ya tienes una base: audiencia concreta, utilidad, autoridad y un ritmo asumible. El siguiente paso es elegir el primer problema real que resolverá el episodio uno y construir una escaleta sencilla alrededor de él." };
}

export async function POST(request: NextRequest) {
  const { messages } = await request.json() as { messages?: Message[] };
  if (!Array.isArray(messages) || !messages.length) return NextResponse.json({ error: "Falta la conversación." }, { status: 400 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ ...fallback(messages), examples: await spotifyExamples(messages) });
  try {
    const prompt = `Eres Jony, un asesor de podcast español directo, escéptico y útil. Mantén una conversación natural, no un cuestionario: responde a lo que diga la persona y plantea COMO MÁXIMO una pregunta útil. Sé breve: 45-70 palabras como máximo; nunca escribas una parrafada. Tienes criterio sobre nicho, audiencia, formatos, entrevistas, guion, temporadas y producción sostenible. Cuando ayude, da 2 o 3 ejemplos concretos de episodios o contenidos que harías para SU tema, no consejos genéricos. Puedes nombrar un podcast existente solo si estás completamente seguro de que existe; si no, no inventes títulos, ejemplos, rankings ni datos actuales. Este es un acceso Free: orienta, pero no entregues tutoriales completos, plantillas, procesos detallados ni todo el material. Cuando la persona pida profundidad, ciérralo en una frase breve: "Para bajar esto a guiones y una estructura real, apúntate a la Masterclass: desbloquea Academy durante un año." No prometas éxito. Devuelve SOLO JSON con esta forma: {"reply":"..."}. Conversación: ${JSON.stringify(messages)}`;
    const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify({ model: process.env.OPENAI_PODCAST_MODEL || "gpt-4.1-mini", response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] }) });
    if (!response.ok) throw new Error("OpenAI unavailable");
    const body = await response.json() as { choices?: { message?: { content?: string } }[] };
    const data = JSON.parse(body.choices?.[0]?.message?.content || "{}") as { reply?: string };
    if (!data.reply) throw new Error("Respuesta incompleta");
    return NextResponse.json({ reply: data.reply, examples: await spotifyExamples(messages) });
  } catch { return NextResponse.json({ ...fallback(messages), examples: await spotifyExamples(messages) }); }
}
