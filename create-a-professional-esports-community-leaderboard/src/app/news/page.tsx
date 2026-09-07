import Link from "next/link";
import { ArrowLeft, CalendarDays, ExternalLink, Newspaper, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { getTournamentNews } from "@/lib/google-sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function normalizeType(value?: string) {
  const type = String(value || "News").trim();
  return type || "News";
}

export default async function NewsPage() {
  const allNews = await getTournamentNews();
  const news = allNews
    .filter((item) => String(item.status || "Published").toLowerCase() !== "hidden")
    .filter((item) => item.title.trim())
    .sort((a, b) => {
      const aTime = a.date ? new Date(a.date).getTime() : 0;
      const bTime = b.date ? new Date(b.date).getTime() : 0;
      return bTime - aTime;
    });

  return (
    <main className="dashboard-inspired-site min-h-screen">
      <Header />

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/"
              className="mb-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 transition hover:border-gold/40 hover:text-gold"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Rankings
            </Link>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
                <Newspaper className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-gold">TNFFM Community</p>
                <h1 className="font-rajdhani text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
                  News & Updates
                </h1>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              Tournament announcements, results, community updates and the latest official TNFFM news in one place.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Sparkles className="h-4 w-4 text-gold" />
            {news.length} {news.length === 1 ? "Update" : "Updates"}
          </div>
        </div>

        {news.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/35 px-6 py-16 text-center shadow-glow">
            <Newspaper className="mx-auto h-10 w-10 text-slate-600" />
            <h2 className="mt-4 font-rajdhani text-2xl font-bold text-white">No news published yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              New tournament news and community updates will appear here automatically when published.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {news.map((item, index) => (
              <article
                key={item.id || `${item.title}-${item.date || index}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/45 shadow-glow transition duration-300 hover:-translate-y-1 hover:border-gold/30"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-gold/10 via-black to-black">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      loading={index < 3 ? "eager" : "lazy"}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full place-items-center">
                      <Newspaper className="h-12 w-12 text-gold/30" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  <span className="absolute left-3 top-3 rounded-full border border-gold/30 bg-black/75 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-gold backdrop-blur">
                    {normalizeType(item.type)}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>{formatDate(item.date) || "TNFFM Update"}</span>
                  </div>
                  <h2 className="font-rajdhani text-2xl font-bold leading-tight text-white transition group-hover:text-gold">
                    {item.title}
                  </h2>
                  {item.description ? (
                    <p className="mt-3 line-clamp-5 text-sm leading-6 text-slate-400">{item.description}</p>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">Official TNFFM community update.</p>
                  )}

                  <div className="mt-auto pt-5">
                    {item.link ? (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-xs font-black uppercase tracking-wider text-gold transition hover:bg-gold hover:text-black"
                      >
                        Read Full Update
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                        Official TNFFM News
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
