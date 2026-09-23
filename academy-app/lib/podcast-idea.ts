export type DemoAnswers = { topic: string; audience: string; purpose: string };
export type PodcastAnswers = Partial<DemoAnswers> & { experience?: string; format?: string; medium?: string; frequency?: string; references?: string; competitors?: { name: string; likes?: string; dislikes?: string; missing?: string; different?: string }[]; difference?: string; time?: string; team?: string; __step?: number };
export type IdeaAnalysis = { summary: string; concreteness: "bajo" | "medio" | "alto"; strength: string; clarify: string; reframing: string; audience: string; need: string; sustainability: string; recommendedFormat: string; duration: string; frequency: string; opportunities: string[]; finalProposal: string; episodes: string[] };

const title = (topic: string, n: number) => {
  const starters = ["La pregunta incómoda sobre", "Cómo empezar con", "Lo que nadie te cuenta de", "¿Merece la pena apostar por", "Una historia real para entender", "Errores frecuentes al hablar de", "La guía práctica de", "Qué cambiaría si empezaras hoy con", "Conversaciones que abren otra mirada sobre", "El siguiente paso después de"];
  return `${starters[n]} ${topic.trim().toLowerCase()}`;
};

const lowerFirst = (value: string) => value ? `${value.charAt(0).toLocaleLowerCase("es-ES")}${value.slice(1)}` : value;

export function buildFallbackAnalysis(a: PodcastAnswers): IdeaAnalysis {
  const broad = (a.topic || "").trim().split(/\s+/).length < 4 || !(a.audience || "").trim();
  const concreteness = broad ? "bajo" : (a.purpose || "").trim().length < 35 ? "medio" : "alto";
  const subject = a.topic?.trim() || "tu tema";
  const audience = a.audience?.trim() || "una audiencia por concretar";
  const purpose = a.purpose?.trim() || "aportar una mirada útil";
  const format = a.format && a.format !== "Todavía no lo sé" ? a.format : "episodios en solitario o entrevistas breves";
  const frequency = a.frequency || "una frecuencia quincenal";
  return {
    summary: `Con la información disponible, planteas un podcast sobre ${lowerFirst(subject)} para ${lowerFirst(audience)}. Quieres ${lowerFirst(purpose)}.`,
    concreteness,
    strength: `Ya tienes un punto de partida: conectar ${subject} con ${audience}. La siguiente clave es convertir esa intención en una promesa clara para cada episodio.`,
    clarify: broad ? "La idea todavía abarca varios caminos. Para enfocarla, elige una situación concreta, un tipo de persona o un resultado que quieras trabajar primero." : "Antes de decidir el formato, concreta qué problema o momento de la audiencia ayudará a resolver cada episodio. Esa decisión guía después el guion y los temas.",
    reframing: `Puedes enfocar ${subject} en preguntas y experiencias concretas de ${audience}. Así cada episodio parte de una necesidad reconocible y termina con una idea útil.`,
    audience,
    need: `La audiencia podría encontrar contexto, ideas prácticas y compañía alrededor de ${subject}.`,
    sustainability: a.time ? `Con ${a.time}, prioriza una estructura repetible y una periodicidad asumible.` : "Antes de fijar el calendario, conviene probar una estructura que puedas repetir sin agotarte.",
    recommendedFormat: format,
    duration: a.medium === "Vídeo" ? "20 a 35 minutos, con cortes breves reutilizables." : "18 a 30 minutos para facilitar una producción sostenible.",
    frequency,
    opportunities: ["Elegir un problema muy reconocible por episodio.", "Usar una voz y experiencia propia en lugar de resumir lo que ya existe.", "Cerrar cada entrega con una decisión o acción posible."],
    finalProposal: `Este podcast está dirigido a ${audience}. En cada episodio explora ${subject} para que la audiencia pueda ${purpose.toLowerCase()}. Se diferencia de otros proyectos porque parte de experiencias y preguntas concretas, no de consejos generales.`,
    episodes: Array.from({ length: 10 }, (_, i) => title(subject, i)),
  };
}
