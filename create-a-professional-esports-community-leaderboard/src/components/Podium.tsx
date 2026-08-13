"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Crown, Medal } from "lucide-react";
import { RankedTeam } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

export function Podium({ teams }: { teams: RankedTeam[] }) {
  const top = [teams[1], teams[0], teams[2]].filter((team): team is RankedTeam => Boolean(team));

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-rajdhani text-sm font-bold uppercase tracking-[0.25em] text-gold">Top 3 Podium</p>
          <h2 className="font-rajdhani text-4xl font-bold uppercase text-white">Community Elite</h2>
        </div>
        <p className="max-w-xl text-sm text-slate-400">Ranked by official TNFFM tournament standings, verified finals results, and placement-based Community Score.</p>
      </div>
      <div className="grid items-end gap-5 lg:grid-cols-3">
        {top.map((team, index) => {
          const isChampion = team.rank === 1;
          const theme = team.rank === 1 ? "border-gold/70 bg-gold/5 shadow-glow" : team.rank === 2 ? "border-silver/60 bg-silver/5" : "border-bronze/60 bg-bronze/5";
          const scoreColor = team.rank === 1 ? "text-gold" : team.rank === 2 ? "text-silver" : "text-bronze";
          return (
            <motion.div
              key={team.slug}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
            >
              <Link href={`/teams/${team.slug}`} className={`glass block rounded-lg border ${theme} p-5 transition hover:-translate-y-1 hover:border-gold/70 ${isChampion ? "lg:min-h-[430px]" : "lg:min-h-[370px]"}`}>
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TeamLogo src={team.logoUrl} name={team.teamName} size={72} champion={isChampion} />
                    <div>
                      <div className={`flex items-center gap-2 text-sm ${scoreColor}`}>
                        {isChampion ? <Crown className="h-4 w-4" /> : <Medal className="h-4 w-4" />}
                        Rank {team.rank}
                      </div>
                      <h3 className="font-rajdhani text-3xl font-bold text-white">{team.teamName}</h3>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg bg-black/35 p-5 text-center">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Community Points</p>
                  <p className={`font-rajdhani text-5xl font-bold ${scoreColor}`}>{team.communityPoints.toLocaleString()}</p>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <PodiumMetric label="Titles" value={team.championships} />
                  <PodiumMetric label="Runner-Up" value={team.runnerUp} />
                  <PodiumMetric label="Events" value={team.eventsPlayed || team.top3Finishes + (team.top5Finishes || 0) + (team.finalistFinishes || team.grandFinals || 0) + (team.officialMatchFinalists || 0)} />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function PodiumMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-center">
      <div className="font-rajdhani text-2xl font-bold text-white">{value}</div>
      <div className="text-xs uppercase tracking-[0.12em] text-slate-500">{label}</div>
    </div>
  );
}
