"use client";

import { Clock, ExternalLink, Sigma, TrendingUp } from "lucide-react";
import type { RankedTeam } from "@/lib/types";
import type { TournamentNews } from "@/lib/google-sheets";

export function RankingsInsights({ teams, news }: { teams: RankedTeam[]; news: TournamentNews[] }) {
  const titleGap = teams[1] ? teams[0].communityPoints - teams[1].communityPoints : 0;
  const visibleNews = news
    .filter((item) => String(item.status || "Published").toLowerCase() !== "hidden")
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    .slice(0, 4);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <div className="glass rounded-lg p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="font-rajdhani text-sm font-bold uppercase tracking-[0.25em] text-gold">TNFFM News</p>
              <h2 className="font-rajdhani text-4xl font-bold uppercase text-white">News & Updates</h2>
            </div>
            <TrendingUp className="h-7 w-7 shrink-0 text-red-400" />
          </div>

          {visibleNews.length > 0 ? (
            <div className="space-y-3">
              {visibleNews.map((item, index) => (
                <article
                  key={item.id || `${item.title}-${item.date}-${index}`}
                  className="rounded-lg border border-white/10 bg-black/35 p-4 transition-colors hover:border-gold/25"
                >
                  <div className="flex items-start gap-3">
                    {item.imageUrl ? (
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg border border-gold/20 bg-gold/5">
                        <Clock className="h-5 w-5 text-gold" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em]">
                        <span className="rounded-full border border-gold/25 px-2 py-1 text-gold">{item.type || "Update"}</span>
                        <span className="text-slate-500">{item.date || "Recent"}</span>
                      </div>
                      <h3 className="mt-2 font-semibold text-white">{item.title}</h3>
                      {item.description && (
                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-400">{item.description}</p>
                      )}
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-gold hover:text-white"
                        >
                          Read more <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid min-h-[300px] place-items-center rounded-lg border border-dashed border-white/10 bg-black/20 px-6 text-center">
              <div>
                <Clock className="mx-auto h-8 w-8 text-slate-600" />
                <p className="mt-3 font-semibold text-slate-300">No news or updates yet</p>
                <p className="mt-1 text-sm text-slate-500">New tournament announcements will appear here.</p>
              </div>
            </div>
          )}
        </div>

        <div className="glass rounded-lg p-6">
          <div className="mb-5 flex items-center gap-3">
            <Sigma className="h-7 w-7 text-gold" />
            <div>
              <p className="font-rajdhani text-sm font-bold uppercase tracking-[0.25em] text-gold">Points Formula</p>
              <h2 className="font-rajdhani text-3xl font-bold uppercase text-white">TNFFM CP System</h2>
            </div>
          </div>
          <div className="space-y-2 text-sm text-slate-300">
            {[
              "Championships x 100",
              "Runner-Up x 70",
              "2nd Runner-Up x 50",
              "Top 5 finish x 25",
              "Finalist x 15",
              "Free Fire MAX official finalist x 100",
            ].map((rule) => (
              <div key={rule} className="flex items-center justify-between rounded-lg bg-black/35 px-4 py-3">
                <span>{rule}</span>
                <span className="h-2 w-2 rounded-full bg-gold" />
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
            Current title gap: <span className="font-bold text-gold">{titleGap.toLocaleString()} CP</span> between Rank 1 and Rank 2.
          </p>
        </div>
      </div>
    </section>
  );
}
