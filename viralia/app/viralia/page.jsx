import Link from "next/link";
import HeroEpisodePlay from "./HeroEpisodePlay";
import EpisodePlaylist from "./EpisodePlaylist";
import {
  buildTrendChartPoints,
  formatTrendTraffic,
  getEpisodes,
  getLatestEpisode,
  getTrendSourcePanels,
  getTrendSignals,
  PODCAST_CONFIG,
} from "../../lib/trendcast";
import { toAbsoluteUrl } from "../../lib/site";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Google Trends España en audio y tendencias virales en tiempo real",
  description:
    "Viralia reúne episodios sobre Google Trends España, tendencias virales, búsquedas en tiempo real y palabras más buscadas del momento, con audio directo y contexto rápido.",
  keywords: [
    "google trends espana",
    "google trends españa",
    "tendencias virales hoy",
    "tendencias en tiempo real",
    "busquedas trending hoy",
    "búsquedas en tiempo real",
    "palabras más buscadas",
    "podcast tendencias",
    "tendencias google hoy",
    "podcast google trends",
  ],
  openGraph: {
    title: "Viralia | Google Trends España en audio",
    description:
      "Episodios y gráfico en directo de Google Trends España, tendencias virales y búsquedas en tiempo real.",
    url: toAbsoluteUrl("/viralia"),
    images: [toAbsoluteUrl("/trendcast/viralia-cover.png")],
  },
  alternates: {
    canonical: toAbsoluteUrl("/viralia"),
  },
};

const googleAccentClasses = [
  "border-sky-300/30 bg-sky-400/10 text-sky-200",
  "border-red-300/30 bg-red-400/10 text-red-200",
  "border-amber-300/30 bg-amber-400/10 text-amber-100",
  "border-emerald-300/30 bg-emerald-400/10 text-emerald-200",
];

function TrendBars({ trends }) {
  const points = buildTrendChartPoints(trends).slice(0, 8);
  const chartHeight = 260;
  const chartWidth = 720;
  const stepX = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth;
  const linePoints = points.map((trend, index) => {
    const x = Math.round(index * stepX);
    const y = Math.round(chartHeight - (trend.chartValue / 100) * (chartHeight - 28) - 14);
    return { ...trend, x, y };
  });
  const polylinePoints = linePoints.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPoints = [
    `0,${chartHeight}`,
    ...linePoints.map((point) => `${point.x},${point.y}`),
    `${chartWidth},${chartHeight}`,
  ].join(" ");

  return (
    <section className="glass rounded-[2rem] border border-white/10 p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-cyan/70">Google Trends Espana</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white">
            Lo que sube ahora mismo
          </h2>
        </div>
        <p className="max-w-sm text-sm leading-6 text-mist/60">
          Snapshot actualizado desde Google Trends RSS. Menos discurso y más señal.
        </p>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/35 p-5">
          <div className="relative">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-72 w-full overflow-visible">
              {[0, 1, 2, 3].map((row) => {
                const y = Math.round((chartHeight / 3) * row);
                return (
                  <line
                    key={`grid-${row}`}
                    x1="0"
                    y1={y}
                    x2={chartWidth}
                    y2={y}
                    stroke="rgba(255,255,255,0.12)"
                    strokeDasharray="6 10"
                  />
                );
              })}
              <polygon fill="rgba(97,244,222,0.12)" points={areaPoints} />
              <polyline
                fill="none"
                stroke="rgba(97,244,222,0.95)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylinePoints}
              />
              {linePoints.map((point) => (
                <g key={`${point.id}-dot`}>
                  <circle cx={point.x} cy={point.y} r="9" fill="rgba(97,244,222,0.18)" />
                  <circle cx={point.x} cy={point.y} r="4.5" fill="#ffffff" />
                </g>
              ))}
            </svg>
            <div className="mt-4 grid grid-cols-4 gap-3 md:grid-cols-8">
              {linePoints.map((trend) => (
                <div key={`${trend.id}-label`} className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-cyan/65">
                    {formatTrendTraffic(trend.growthScore)}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[11px] uppercase tracking-[0.12em] text-mist/68">
                    {trend.shortLabel}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {points.slice(0, 5).map((trend) => (
            <div
              key={`${trend.id}-row`}
              className="rounded-[1.3rem] border border-white/10 bg-white/[0.04] px-4 py-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-[0.2em] text-cyan/70">
                  #{trend.rank}
                </span>
                <span className="text-xs uppercase tracking-[0.2em] text-mist/55">
                  {formatTrendTraffic(trend.growthScore)}
                </span>
              </div>
              <h3 className="mt-2 text-lg font-semibold text-white">{trend.keyword}</h3>
              <p className="mt-2 text-sm text-mist/62">
                {trend.relatedSearches?.[0] || trend.category}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SourcePanel({ panel }) {
  const toneClass =
    panel.status === "live"
      ? "text-cyan border-cyan/20 bg-cyan/10"
      : panel.status === "api"
        ? "text-amber-200 border-amber-200/20 bg-amber-200/10"
        : "text-mist/75 border-white/10 bg-white/[0.04]";

  return (
    <div className="glass rounded-[1.8rem] border border-white/10 p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-white">{panel.title}</h3>
        <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.22em] ${toneClass}`}>
          {panel.status}
        </span>
      </div>
      <p className="mt-3 text-sm leading-7 text-mist/66">{panel.description}</p>
      {panel.items?.length ? (
        <div className="mt-5 space-y-3">
          {panel.items.map((item, index) => (
            <div
              key={`${panel.id}-${index}`}
              className="rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <p className="text-sm font-medium text-white">{item.title}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-mist/55">{item.meta}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-[1.1rem] border border-dashed border-white/10 px-4 py-4 text-sm text-mist/50">
          Fuente preparada para sumar señal adicional sin interrumpir la escucha.
        </div>
      )}
    </div>
  );
}

export default async function ViraliaPage() {
  const [latestEpisode, episodes, trends, sourcePanels] = await Promise.all([
    getLatestEpisode(),
    getEpisodes(),
    getTrendSignals(),
    getTrendSourcePanels(),
  ]);

  const topKeywords = trends.slice(0, 8).map((trend) => trend.keyword).join(", ");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "PodcastSeries",
    name: "Viralia",
    url: toAbsoluteUrl("/viralia"),
    description:
      "Podcast sobre Google Trends España, tendencias virales, búsquedas en tiempo real y cultura de internet explicado en audio.",
    inLanguage: "es-ES",
    genre: ["News Commentary", "Technology"],
    image: toAbsoluteUrl("/trendcast/viralia-cover.png"),
    publisher: {
      "@type": "Organization",
      name: "Local Reset",
      url: toAbsoluteUrl("/"),
    },
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(66,133,244,0.18),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(234,67,53,0.16),transparent_24%),radial-gradient(circle_at_68%_62%,rgba(251,188,5,0.12),transparent_22%),radial-gradient(circle_at_24%_74%,rgba(52,168,83,0.14),transparent_22%),linear-gradient(160deg,#050b16,#0a1830_52%,#102447)]" />
      <div className="absolute inset-0 grid-bg opacity-20" />
      <section className="relative isolate border-b border-white/10">
        <div className="absolute left-0 top-0 h-80 w-80 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="absolute right-0 top-24 h-96 w-96 rounded-full bg-red-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.32em] text-mist/70">
                <span className="h-2 w-2 rounded-full bg-sky-300 shadow-[0_0_18px_rgba(96,165,250,0.8)]" />
                {PODCAST_CONFIG.name}
              </div>
              <p className="text-sm font-medium text-mist/75">Bienvenidos a Viralia</p>
              <h1 className="max-w-4xl text-5xl font-semibold leading-none tracking-[-0.05em] text-white md:text-7xl">
                Viralia. El algoritmo nunca duerme
              </h1>
              <p className="text-sm font-medium text-mist/75">Un podcast de Local Reset</p>
              <HeroEpisodePlay audioUrl={latestEpisode.audio_url} title={latestEpisode.title} />
              <p className="max-w-2xl text-base leading-8 text-mist/66">
                El algoritmo deja pistas en cada búsqueda. Viralia las ordena, las contrasta y te cuenta
                en audio qué está moviendo las conversaciones.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/feed.xml"
                  className="rounded-full bg-cyan px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white"
                >
                  Feed RSS
                </Link>
                <Link
                  href="#playlist"
                  className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white/90 transition hover:border-cyan/70 hover:text-cyan"
                >
                  Playlist anterior
                </Link>
                <Link
                  href="/viralia/radar"
                  className="rounded-full border border-sky-300/35 bg-sky-300/10 px-6 py-3 text-sm font-semibold text-sky-100 transition hover:border-cyan/70 hover:bg-cyan/10 hover:text-cyan"
                >
                  Radar de actualidad
                </Link>
              </div>
            </div>

            <div className="glass rounded-[2rem] border border-white/10 p-6 md:p-8">
                <p className="text-xs uppercase tracking-[0.28em] text-sky-200/80">Palabras más buscadas</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {trends.slice(0, 10).map((trend, index) => (
                    <span
                      key={`${trend.id}-chip`}
                      className={`rounded-full border px-3 py-2 text-xs uppercase tracking-[0.16em] ${
                        googleAccentClasses[index % googleAccentClasses.length]
                      }`}
                    >
                      {trend.keyword}
                    </span>
                  ))}
                </div>
                <p className="mt-5 text-sm leading-7 text-mist/60">
                  {topKeywords}. Una lectura rápida del pulso que dejan las búsquedas cuando el
                  algoritmo cambia de ritmo.
                </p>
                <p className="mt-3 text-xs text-mist/45">Datos basados en Google.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="playlist" className="relative mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <div className="mb-6 flex items-end justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan/70">En audio</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white">
              Escucha Viralia
            </h2>
          </div>
        </div>
        <EpisodePlaylist episodes={episodes.slice(0, 8)} />
      </section>

      <section className="relative mx-auto max-w-7xl px-6 py-4 lg:px-10">
        <TrendBars trends={trends} />
      </section>

      <section className="relative mx-auto max-w-7xl px-6 py-4 lg:px-10">
        <div className="mb-6 flex items-end justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan/70">Fuentes</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white">
              Más señal alrededor de la tendencia
            </h2>
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {sourcePanels.map((panel) => (
            <SourcePanel key={panel.id} panel={panel} />
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-6 pb-24 lg:px-10">
        <div className="glass rounded-[2rem] border border-white/10 p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-cyan/70">Sobre Viralia</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white">
            Google Trends España, búsquedas virales y contexto rápido en audio
          </h2>
          <div className="mt-5 grid gap-6 lg:grid-cols-3">
            <div>
              <h3 className="text-base font-semibold text-white">Qué es Viralia</h3>
              <p className="mt-2 text-sm leading-7 text-mist/68">
                Viralia es un podcast corto sobre tendencias virales, palabras más buscadas y búsquedas en
                tiempo real. Cada episodio resume por qué ciertos nombres, temas o noticias se disparan
                hoy en internet.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Qué señales usa</h3>
              <p className="mt-2 text-sm leading-7 text-mist/68">
                La base del proyecto es Google Trends España, reforzada con señales públicas de Reddit
                y Hacker News para entender mejor qué se mueve en cultura de internet, tecnología,
                deporte y actualidad viral.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Qué encontrarás aquí</h3>
              <p className="mt-2 text-sm leading-7 text-mist/68">
                Una landing con el último episodio de Viralia, una playlist de episodios anteriores y
                un gráfico en directo con búsquedas trending, tendencias google hoy y temas que están
                subiendo ahora mismo en España.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
