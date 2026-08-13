"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Activity, RadioTower, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import { RankedTeam } from "@/lib/types";
import { TeamLogo } from "@/components/TeamLogo";

export function Hero({ teams }: { teams: RankedTeam[] }) {
  const totalPoints = teams.reduce((sum, team) => sum + team.communityPoints, 0);
  const stats: [string, string, LucideIcon][] = [
    ["Teams", teams.length.toString(), Users],
    ["Community Points", totalPoints.toLocaleString(), Activity],
    ["Rank Status", "Live", RadioTower],
    ["Rule Set", "TNFFM CP", ShieldCheck]
  ];

  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-arena-grid bg-[length:48px_48px]">
      <Image src="/brand/tnffm-banner.jpg" alt="TNFFM community ranking leaderboard banner" fill priority className="object-cover opacity-35" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-ink/80 to-ink" />
      <div className="relative mx-auto grid min-h-[560px] max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:px-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-sm font-semibold text-gold">
            <RadioTower className="h-4 w-4" />
            Live ranking status
          </div>
          <p className="font-rajdhani text-lg font-bold uppercase tracking-[0.24em] text-red-200">Tamilnadu Free Fire Max Esports</p>
          <Image src="/brand/tnffm-logo.png" alt="TNFFM Esports logo" width={112} height={112} className="mt-5 h-24 w-24 object-contain drop-shadow-[0_0_24px_rgba(255,210,31,0.35)]" />
          <h1 className="mt-3 font-rajdhani text-6xl font-bold uppercase leading-none text-white sm:text-7xl lg:text-8xl">
            <span className="gold-text">TNFFM</span>
          </h1>
          <p className="mt-5 max-w-2xl text-xl text-slate-300">
            Community Rankings for Tamilnadu Free Fire MAX tournament results, achievements, form, and elite team performance.
          </p>
          <div className="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map(([label, value, Icon]) => (
              <div key={label} className="glass rounded-lg p-4">
                <Icon className="mb-3 h-5 w-5 text-gold" />
                <div className="font-rajdhani text-2xl font-bold text-white">{value}</div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.7 }} className="glass relative rounded-lg p-6 shadow-violet">
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Current Champion</p>
              <h2 className="font-rajdhani text-3xl font-bold text-white">{teams[0]?.teamName}</h2>
            </div>
            <div className="rounded-lg border border-gold/30 bg-gold/10 px-4 py-2 text-right">
              <p className="text-xs text-gold">Rank</p>
              <p className="font-rajdhani text-3xl font-bold text-gold">#1</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <Metric label="CP" value={teams[0]?.communityPoints.toLocaleString() || "0"} />
            <Metric label="Championships" value={teams[0]?.championships?.toString() || "0"} />
            <Metric label="Events" value={(teams[0]?.eventsPlayed || teams[0]?.top3Finishes || 0).toString()} />
          </div>
          <div className="relative mt-6 flex items-center justify-center h-48 rounded-lg border border-white/10 bg-black/35">
            {teams[0] ? (
              <TeamLogo src={teams[0].logoUrl} name={teams[0].teamName} size={140} champion={true} />
            ) : (
              <div className="text-slate-400">No champion yet</div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.04] p-4 text-center">
      <div className="font-rajdhani text-2xl font-bold text-white">{value}</div>
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
    </div>
  );
}
