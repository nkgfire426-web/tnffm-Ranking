"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, ExternalLink, Newspaper, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Header } from "@/components/Header";
import type { TournamentNews } from "@/lib/google-sheets";

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function normalizeType(value?: string) {
  const type = String(value || "News").trim();
  return type || "News";
}

function NewsImage({ item, index }: { item: TournamentNews; index: number }) {
  const [failed, setFailed] = useState(false);
  const raw = String(item.imageUrl || "").trim();
  const imageUrl = raw.startsWith("//") ? `https:${raw}` : raw;

  if (!imageUrl || failed) {
    return <div className="grid h-full place-items-center bg-gradient-to-br from-gold/15 via-black to-black"><Newspaper className="h-12 w-12 text-gold/35" /></div>;
  }

  return (
    <img
      src={imageUrl}
      alt={item.title || "TNFFM News"}
      loading={index < 3 ? "eager" : "lazy"}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
    />
  );
}

function NewsCard({ item, index }: { item: TournamentNews; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const description = String(item.description || "").trim();
  const hasMore = description.length > 240;
  const preview = hasMore ? `${description.slice(0, 240).trimEnd()}…` : description;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/45 shadow-glow transition duration-300 hover:-translate-y-1 hover:border-gold/30">
      <div className="relative aspect-[16/9] overflow-hidden bg-black">
        <NewsImage item={item} index={index} />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full border border-gold/30 bg-black/80 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-gold backdrop-blur">
          {normalizeType(item.type)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>{formatDate(item.date) || "TNFFM Update"}</span>
        </div>
        <h2 className="font-rajdhani text-2xl font-bold leading-tight text-white transition group-hover:text-gold">{item.title}</h2>

        {description ? (
          <div className="mt-3">
            <p className="whitespace-pre-line text-sm leading-6 text-slate-400">{expanded ? description : preview}</p>
            {hasMore && (
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-gold transition hover:text-white"
              >
                {expanded ? "Show Less" : "Read More"}
                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Official TNFFM community update.</p>
        )}

        <div className="mt-auto pt-5">
          {item.link ? (
            <a href={item.link} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-xs font-black uppercase tracking-wider text-gold transition hover:bg-gold hover:text-black">
              Open Full Update <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Official TNFFM News</div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function NewsPage() {
  const [news, setNews] = useState<TournamentNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useState(() => {
    fetch("/api/news", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to load news");
        return response.json();
      })
      .then((data) => {
        const items = Array.isArray(data?.news) ? data.news : Array.isArray(data) ? data : [];
        setNews(items.filter((item: TournamentNews) => String(item.status || "Published").toLowerCase() !== "hidden" && String(item.title || "").trim()).sort((a: TournamentNews, b: TournamentNews) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  });

  return (
    <main className="dashboard-inspired-site min-h-screen">
      <Header />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/" className="mb-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 transition hover:border-gold/40 hover:text-gold"><ArrowLeft className="h-4 w-4" /> Back to Rankings</Link>
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-gold/30 bg-gold/10 text-gold"><Newspaper className="h-5 w-5" /></span><div><p className="text-xs font-black uppercase tracking-[0.25em] text-gold">TNFFM Community</p><h1 className="font-rajdhani text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">News & Updates</h1></div></div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">Tournament announcements, results, community updates and the latest official TNFFM news in one place.</p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400"><Sparkles className="h-4 w-4 text-gold" /> {loading ? "Loading" : `${news.length} ${news.length === 1 ? "Update" : "Updates"}`}</div>
        </div>

        {loading ? <div className="rounded-2xl border border-white/10 bg-black/35 px-6 py-16 text-center text-sm text-slate-500">Loading news…</div> : error ? <div className="rounded-2xl border border-white/10 bg-black/35 px-6 py-16 text-center text-sm text-slate-500">Unable to load news right now. Please refresh the page.</div> : news.length === 0 ? <div className="rounded-2xl border border-white/10 bg-black/35 px-6 py-16 text-center shadow-glow"><Newspaper className="mx-auto h-10 w-10 text-slate-600" /><h2 className="mt-4 font-rajdhani text-2xl font-bold text-white">No news published yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">New tournament news and community updates will appear here automatically when published.</p></div> : <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{news.map((item, index) => <NewsCard key={item.id || `${item.title}-${item.date || index}`} item={item} index={index} />)}</div>}
      </section>
    </main>
  );
}
