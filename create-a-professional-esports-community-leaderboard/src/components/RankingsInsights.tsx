"use client";

import { Clock, ExternalLink, TrendingUp } from "lucide-react";
import type { RankedTeam } from "@/lib/types";
import type { TournamentNews } from "@/lib/google-sheets";
import { normalizeImageUrl } from "./TeamLogo";

export function RankingsInsights({ teams, news }: { teams: RankedTeam[]; news: TournamentNews[] }) {
  const visibleNews = news
    .filter((item) => String(item.status || "Published").toLowerCase() !== "hidden")
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    .slice(0, 6);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="glass rounded-xl p-6 sm:p-8">
        <div className="mb-7 flex items-center justify-between gap-4">
          <div>
            <p className="font-rajdhani text-sm font-bold uppercase tracking-[0.25em] text-gold">TNFFM News</p>
            <h2 className="font-rajdhani text-4xl font-bold uppercase text-white sm:text-5xl">News & Updates</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Latest tournament announcements, community updates and TNFFM news.</p>
          </div>
          <TrendingUp className="h-8 w-8 shrink-0 text-red-400" />
        </div>

        {visibleNews.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {visibleNews.map((item, index) => {
              const imageSrc = item.imageUrl ? normalizeImageUrl(item.imageUrl) : "";
              return (
                <article key={item.id || `${item.title}-${item.date}-${index}`} className="group rounded-xl border border-white/10 bg-black/35 p-5 transition-all hover:-translate-y-0.5 hover:border-gold/30 hover:bg-black/50">
                  <div className="flex items-start gap-4">
                    {imageSrc && imageSrc !== "/tnffm-default-logo.svg" ? (
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40">
                        <img src={imageSrc} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                      </div>
                    ) : (
                      <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl border border-gold/20 bg-gold/5"><Clock className="h-6 w-6 text-gold" /></div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em]">
                        <span className="rounded-full border border-gold/25 px-2 py-1 text-gold">{item.type || "Update"}</span>
                        <span className="text-slate-500">{item.date || "Recent"}</span>
                      </div>
                      <h3 className="mt-2 line-clamp-2 font-semibold text-white">{item.title}</h3>
                      {item.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-400">{item.description}</p>}
                      {item.link && /^https?:\/\//i.test(item.link) && <a href={item.link} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-gold hover:text-white">Read more <ExternalLink className="h-3 w-3" /></a>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="grid min-h-[360px] place-items-center rounded-xl border border-dashed border-white/10 bg-black/20 px-6 text-center">
            <div><Clock className="mx-auto h-9 w-9 text-slate-600" /><p className="mt-3 font-semibold text-slate-300">No news or updates yet</p><p className="mt-1 text-sm text-slate-500">New tournament announcements will appear here.</p></div>
          </div>
        )}
      </div>
    </section>
  );
}
