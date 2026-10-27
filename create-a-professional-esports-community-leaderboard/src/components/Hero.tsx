"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CalendarDays, RadioTower, Send, Trophy, ChevronUp, ChevronDown, Newspaper } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RankedTeam } from "@/lib/types";
import { normalizeImageUrl } from "./TeamLogo";

type TournamentNews = { id?: string; title: string; description?: string; date?: string; type?: string; status?: string; imageUrl?: string; link?: string };

export function Hero({ teams, news = [] }: { teams: RankedTeam[]; news?: TournamentNews[] }) {
  const updates = useMemo(() => news
    .map((item, originalIndex) => ({ item, originalIndex }))
    .filter(({ item }) => {
      const status = String(item.status || "Published").trim().toLowerCase();
      return status === "published" || status === "active";
    })
    .sort((a, b) => {
      const aTime = a.item.date ? Date.parse(a.item.date) : Number.NaN;
      const bTime = b.item.date ? Date.parse(b.item.date) : Number.NaN;
      if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) return bTime - aTime;
      if (Number.isFinite(aTime) !== Number.isFinite(bTime)) return Number.isFinite(aTime) ? -1 : 1;
      return a.originalIndex - b.originalIndex;
    })
    .map(({ item }) => item), [news]);

  const [activeUpdate, setActiveUpdate] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setActiveUpdate(0);
  }, [updates.length]);

  useEffect(() => {
    if (updates.length < 2 || paused) return;
    const timer = window.setInterval(() => {
      setActiveUpdate((current) => (current + 1) % updates.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [updates.length, paused]);

  const currentUpdate = updates[activeUpdate];

  return <section className="relative overflow-hidden border-b border-gold/15 bg-[#050507]">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(255,210,31,.10),transparent_28%),linear-gradient(180deg,#08080a,#050507)]" />
    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/80 to-transparent" />
    <div className="relative mx-auto grid min-h-0 max-w-7xl items-center gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:min-h-[560px] lg:grid-cols-[1.08fr_.92fr] lg:gap-10 lg:px-8 lg:py-16">
      <motion.div className="min-w-0" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
        <div className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/5 px-3 py-2 text-[10px] font-black uppercase tracking-[.2em] text-gold sm:px-4 sm:text-xs"><RadioTower className="h-3.5 w-3.5" />Official Esports Platform</div>
        <p className="mt-6 font-rajdhani text-sm font-bold uppercase tracking-[.25em] text-gold/80 sm:text-base">Tamilnadu Free Fire India Esports</p>
        <div className="mt-5 flex items-center gap-4"><span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-gold/30 bg-black p-2 sm:h-20 sm:w-20"><img src="/brand/tnffm-logo.png" alt="TNFFI Esports logo" className="h-full w-full object-contain" /></span><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[.2em] text-slate-500">Official esports platform</p><h1 className="mt-1 font-rajdhani text-6xl font-black uppercase leading-[.82] text-white sm:text-8xl"><span className="gold-text">TNFFI</span></h1></div></div>
        <p className="mt-7 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">Tamilnadu Free Fire India Esports — rankings, tournament results, team achievements and community performance.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link href="/ranking" className="group inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-3.5 font-bold text-black transition hover:-translate-y-0.5 hover:bg-yellow-300"><Trophy className="h-4 w-4" />Explore Rankings <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></Link><Link href="/submit-results" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[.025] px-5 py-3.5 font-semibold text-slate-200 transition hover:-translate-y-0.5 hover:border-gold/35 hover:text-gold"><Send className="h-4 w-4" />Submit Results</Link></div>
        <div className="mt-9 grid max-w-2xl grid-cols-3 gap-2 sm:gap-3"><InfoCard label="Ranked teams" value={teams.length.toString()} /><InfoCard label="Community score" value={teams.reduce((sum, team) => sum + (Number(team.communityPoints) || 0), 0).toLocaleString()} /><InfoCard label="Championships" value={teams.reduce((sum, team) => sum + (Number(team.championships) || 0), 0).toString()} /></div>
      </motion.div>
      <motion.div className="glass relative min-w-0 w-full overflow-hidden rounded-3xl border-white/10 bg-black/50 p-4 shadow-[0_30px_90px_rgba(0,0,0,.4)] sm:p-5" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, duration: 0.65 }}>
        <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
        <div className="flex items-center justify-between border-b border-white/10 px-1 pb-4"><div><p className="text-[10px] font-black uppercase tracking-[.24em] text-gold">TNFFI Feed</p><h2 className="mt-1 font-rajdhani text-2xl font-bold text-white sm:text-3xl">Latest Updates</h2></div><Trophy className="h-6 w-6 text-gold" /></div>
        <div className="relative mt-4 min-h-[355px] overflow-hidden sm:min-h-[375px]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false); }}>
          {currentUpdate ? <AnimatePresence mode="wait" initial={false}>
            <motion.div key={currentUpdate.id || currentUpdate.title + activeUpdate} initial={{ opacity: 0, y: 24, filter: "blur(3px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -24, filter: "blur(3px)" }} transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-x-0 top-0">
              <NewsItem item={currentUpdate} />
            </motion.div>
          </AnimatePresence> : <div className="flex min-h-[355px] flex-col justify-center rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:min-h-[375px]"><p className="text-[10px] font-black uppercase tracking-[.2em] text-slate-500">No published updates</p><h3 className="mt-2 font-rajdhani text-xl font-bold text-white">No news is currently published</h3><p className="mt-2 text-sm leading-6 text-slate-400">Published news updates will appear here automatically.</p></div>}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5" aria-label="News update position">
            {updates.slice(0, 8).map((item, index) => <button key={item.id || item.title + index} type="button" aria-label={`Show update ${index + 1}: ${item.title}`} aria-current={activeUpdate === index ? "true" : undefined} onClick={() => setActiveUpdate(index)} className={`!min-h-0 h-2 rounded-full transition-all duration-300 ${activeUpdate === index ? "w-6 bg-gold" : "w-2 bg-white/25 hover:bg-white/50"}`} />)}
          </div>
          {updates.length > 1 && <div className="flex shrink-0 items-center gap-1"><button type="button" aria-label="Show newer update" onClick={() => setActiveUpdate((current) => (current - 1 + updates.length) % updates.length)} className="!min-h-0 grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-300 transition hover:border-gold/30 hover:text-gold"><ChevronUp className="h-4 w-4" /></button><button type="button" aria-label="Show older update" onClick={() => setActiveUpdate((current) => (current + 1) % updates.length)} className="!min-h-0 grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-300 transition hover:border-gold/30 hover:text-gold"><ChevronDown className="h-4 w-4" /></button></div>}
        </div>
        <p className="mt-2 text-center text-[10px] uppercase tracking-[.16em] text-slate-600">{updates.length ? `Update ${activeUpdate + 1} of ${updates.length} · newest first` : "Official news feed"}</p>
        <Link href="/news" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 text-sm font-bold text-gold transition hover:bg-gold/10">View all news <ArrowRight className="h-4 w-4" /></Link>
      </motion.div>
    </div>
  </section>;
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return <div className="glass min-w-0 rounded-xl border-white/10 bg-black/35 p-3 sm:p-4"><div className="font-rajdhani text-lg font-bold text-white sm:text-xl">{value}</div><div className="mt-1 text-[9px] font-bold uppercase tracking-[.16em] text-slate-500">{label}</div></div>;
}

function NewsItem({ item }: { item: TournamentNews }) {
  const imageSrc = item.imageUrl ? normalizeImageUrl(item.imageUrl) : "";
  return <article className="flex h-full min-h-[355px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] sm:min-h-[375px]">
    <div className="h-32 w-full shrink-0 overflow-hidden bg-gradient-to-br from-gold/10 via-black to-black sm:h-36">{imageSrc ? <img src={imageSrc} alt={item.title} className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" /> : <div className="grid h-full place-items-center"><Newspaper className="h-10 w-10 text-gold/30" /></div>}</div>
    <div className="flex min-h-0 flex-1 flex-col p-4">
      <div className="flex items-center gap-2"><div className="shrink-0 rounded-lg border border-gold/20 bg-gold/5 p-2"><CalendarDays className="h-4 w-4 text-gold" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[9px] font-black uppercase tracking-[.18em] text-gold">{item.type || "Update"}</span>{item.date && <span className="text-[10px] text-slate-500">{item.date}</span>}</div></div></div>
      <h3 className="mt-3 line-clamp-2 min-h-[3.2rem] font-rajdhani text-xl font-bold leading-tight text-white sm:text-2xl">{item.title}</h3>
      <p className="mt-2 line-clamp-3 min-h-[3.75rem] text-sm leading-5 text-slate-400">{item.description || "Official TNFFI community news and esports update."}</p>
      {item.link && /^https?:\/\//i.test(item.link) && <a href={item.link} target="_blank" rel="noreferrer" className="mt-auto inline-flex items-center gap-1.5 pt-3 text-xs font-bold text-gold hover:underline">View update <ArrowRight className="h-3.5 w-3.5" /></a>}
    </div>
  </article>;
}
