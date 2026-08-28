"use client";

import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, FileCheck2, RadioTower, Send, Trophy } from "lucide-react";
import Link from "next/link";
import { RankedTeam } from "@/lib/types";
import { normalizeImageUrl } from "./TeamLogo";

type TournamentNews = {
  id?: string;
  title: string;
  description?: string;
  date?: string;
  type?: string;
  status?: string;
  imageUrl?: string;
  link?: string;
};

export function Hero({ teams, news = [] }: { teams: RankedTeam[]; news?: TournamentNews[] }) {
  const updates = news.filter((item) => String(item.status || "Published").toLowerCase() !== "hidden").slice(0, 4);

  return (
    <section className="relative overflow-hidden border-b border-gold/15 bg-black">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,210,31,0.10),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
      <div className="pointer-events-none absolute -left-40 top-24 h-80 w-80 rounded-full bg-gold/5 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-80 w-80 rounded-full bg-gold/5 blur-3xl" />
      <div className="relative mx-auto grid min-h-[560px] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-20">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-2 text-sm font-semibold text-gold"><RadioTower className="h-4 w-4" />TNFFM Community Rankings</div>
          <p className="font-rajdhani text-lg font-bold uppercase tracking-[0.24em] text-gold/80">Tamilnadu Free Fire Max Esports</p>
          <div className="mt-5 flex h-24 w-24 items-center justify-center rounded-2xl border border-gold/30 bg-black/80 shadow-[0_0_40px_rgba(255,210,31,0.08)]"><img src="/brand/tnffm-logo.png" alt="TNFFM Esports logo" className="h-20 w-20 object-contain" /></div>
          <h1 className="mt-3 font-rajdhani text-6xl font-bold uppercase leading-none text-white sm:text-7xl lg:text-8xl"><span className="gold-text">TNFFM</span></h1>
          <p className="mt-5 max-w-2xl text-xl text-slate-300">Community Rankings for Tamilnadu Free Fire MAX tournament results, achievements, form, and elite team performance.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/team-dashboard/submissions" className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-3 font-bold text-black shadow-lg shadow-gold/10 hover:bg-yellow-300"><Send className="h-4 w-4" />Submit Final Results</Link>
            <Link href="/rank-system" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 font-semibold text-slate-200 hover:border-gold/30 hover:text-gold"><FileCheck2 className="h-4 w-4" />Assessment Rules</Link>
          </div>
          <div className="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
            <InfoCard label="Teams" value={teams.length.toString()} />
            <InfoCard label="Final Results" value="Assessment" />
            <InfoCard label="Ranking Source" value="Verified" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.7 }} className="glass relative rounded-2xl border-gold/20 bg-white/[0.02] p-5 shadow-[0_0_50px_rgba(255,210,31,0.06)] sm:p-6">
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div><p className="text-xs uppercase tracking-[0.22em] text-gold">TNFFM</p><h2 className="font-rajdhani text-3xl font-bold text-white">Tournament News & Updates</h2></div>
            <Trophy className="h-6 w-6 text-gold" />
          </div>
          <div className="mt-4 space-y-3">
            {updates.length ? updates.map((item, index) => <NewsItem key={item.id || `${item.title}-${index}`} item={item} />) : (
              <div className="rounded-xl border border-white/10 bg-black/30 p-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Latest update</p><h3 className="mt-2 font-rajdhani text-xl font-bold text-white">Final tournament leaderboard submissions are open</h3><p className="mt-2 text-sm leading-6 text-slate-400">Teams can submit their official completed tournament leaderboard for TNFFM ranking assessment.</p></div>
            )}
          </div>
          <Link href="/team-dashboard/submissions" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 text-sm font-bold text-gold hover:bg-gold/10">Submit Final Tournament Leaderboard <ArrowRight className="h-4 w-4" /></Link>
        </motion.div>
      </div>
    </section>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return <div className="glass rounded-xl border-gold/15 bg-white/[0.025] p-4"><div className="font-rajdhani text-xl font-bold text-white">{value}</div><div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</div></div>;
}

function NewsItem({ item }: { item: TournamentNews }) {
  const imageSrc = item.imageUrl ? normalizeImageUrl(item.imageUrl) : "";

  return (
    <article className="overflow-hidden rounded-xl border border-white/10 bg-black/30 transition hover:border-gold/20">
      {imageSrc && <div className="aspect-[16/7] w-full overflow-hidden bg-black"><img src={imageSrc} alt={item.title} className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" /></div>}
      <div className="p-4">
        <div className="flex items-start gap-3"><div className="mt-0.5 rounded-lg border border-gold/20 bg-gold/5 p-2"><CalendarDays className="h-4 w-4 text-gold" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">{item.type || "Update"}</span>{item.date && <span className="text-[10px] text-slate-600">{item.date}</span>}</div><h3 className="mt-1 font-rajdhani text-lg font-bold text-white">{item.title}</h3>{item.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{item.description}</p>}{item.link && /^https?:\/\//i.test(item.link) && <a href={item.link} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-bold text-gold hover:underline">View update →</a>}</div></div>
      </div>
    </article>
  );
}
