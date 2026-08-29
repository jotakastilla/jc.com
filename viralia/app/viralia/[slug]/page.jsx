import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  buildEpisodeFaqs,
  buildEpisodeIntro,
  formatDuration,
  formatEpisodeDate,
  getEpisodeArticle,
  getEpisodeBySlug,
  getEpisodeKeywords,
} from "../../../lib/trendcast";
import { toAbsoluteUrl } from "../../../lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const episode = await getEpisodeBySlug(slug);

  if (!episode) {
    return {
      title: "Episodio no encontrado | Viralia",
    };
  }

  return {
    title: episode.seoTitle,
    description: episode.seoDescription,
    keywords: getEpisodeKeywords(episode),
    openGraph: {
      title: episode.seoTitle,
      description: episode.seoDescription,
      url: episode.episodeUrlAbsolute,
      images: [episode.coverUrlAbsolute],
      type: "article",
    },
    alternates: {
      canonical: episode.episodeUrlAbsolute,
    },
  };
}

export default async function ViraliaEpisodePage({ params }) {
  const { slug } = await params;
  const episode = await getEpisodeBySlug(slug);

  if (!episode) {
    notFound();
  }

  const faqs = buildEpisodeFaqs(episode);
  const article = getEpisodeArticle(episode);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "PodcastEpisode",
    name: episode.title,
    description: episode.description,
    url: episode.episodeUrlAbsolute,
    datePublished: episode.published_at,
    associatedMedia: {
      "@type": "MediaObject",
      contentUrl: episode.audioUrlAbsolute,
      encodingFormat: "audio/mpeg",
    },
    partOfSeries: {
      "@type": "PodcastSeries",
      name: "Viralia",
      url: toAbsoluteUrl("/viralia"),
    },
    keywords: getEpisodeKeywords(episode),
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 text-white lg:px-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="glass rounded-[2rem] border border-white/10 p-8 md:p-12">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="flex min-h-[19rem] flex-col justify-center lg:aspect-square lg:min-h-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-cyan">
                {episode.trend_keyword}
              </span>
              <span className="text-sm text-mist/60">{formatDuration(episode.duration)}</span>
              <span className="text-sm text-mist/60">{formatEpisodeDate(episode.published_at)}</span>
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-white md:text-6xl">
              {episode.title}
            </h1>
            <p className="mt-6 text-lg leading-8 text-mist/70">{episode.description}</p>
            <p className="mt-4 text-base leading-8 text-mist/65">{buildEpisodeIntro(episode)}</p>
          </div>
          <aside className="w-full">
            <div className="relative aspect-square overflow-hidden rounded-[1.6rem] border border-white/10 bg-slate-950/30">
              <Image
                src={episode.cover_url}
                alt={`Portada de ${episode.title}`}
                fill
                priority
                sizes="(min-width: 1024px) 50vw, min(100vw - 3rem, 560px)"
                className="object-cover"
              />
            </div>
          </aside>
        </div>
        <div className="mt-8 border-y border-white/10 py-4">
          <audio controls className="w-full bg-transparent [color-scheme:dark]" preload="none">
            <source src={episode.audio_url} type="audio/mpeg" />
          </audio>
        </div>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/viralia"
            className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white/90 transition hover:border-cyan/70 hover:text-cyan"
          >
            Volver al radar de tendencias
          </Link>
        </div>
      </div>

      <section className="mt-10">
        {article ? (
          <article className="glass rounded-[2rem] border border-white/10 p-8 md:p-12">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan/70">Versión extendida</p>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-mist/80">{article.intro}</p>
            <div className="mt-10 space-y-10">
              {article.sections.map((section, index) => (
                <section key={`${section.heading}-${index}`} className="max-w-3xl">
                  <h2 className="text-2xl font-semibold tracking-[-0.02em] text-white">{section.heading}</h2>
                  <div className="mt-4 space-y-4 leading-8 text-mist/75">
                    {section.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
                  </div>
                  {article.images[index] ? (
                    <figure className="mt-7 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/50">
                      <Image src={article.images[index].url} alt={article.images[index].alt || section.heading} width={1024} height={1024} className="h-auto w-full object-cover" />
                      {article.images[index].caption ? <figcaption className="px-4 py-3 text-sm text-mist/60">{article.images[index].caption}</figcaption> : null}
                    </figure>
                  ) : null}
                </section>
              ))}
            </div>
          </article>
        ) : null}
        <aside className="glass rounded-[2rem] border border-white/10 p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan/70">Qué encontrarás aquí</p>
          <div className="mt-5 space-y-4 text-sm leading-7 text-mist/75">
            {faqs.map((item) => (
              <div key={item.question}>
                <h2 className="text-base font-semibold text-white">{item.question}</h2>
                <p className="mt-2">{item.answer}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
