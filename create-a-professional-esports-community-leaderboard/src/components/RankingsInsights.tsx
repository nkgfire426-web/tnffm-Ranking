import type React from "react";
import { Award, Crosshair, Flame, Sigma, TrendingUp } from "lucide-react";
import type { RankedTeam } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

export function RankingsInsights({ teams }: { teams: RankedTeam[] }) {
  const topKiller = [...teams].sort((a, b) => b.kills - a.kills)[0];
  const runnerUpLeader = [...teams].sort((a, b) => b.runnerUp - a.runnerUp)[0];
  const officialLeader = [...teams].sort((a, b) => (b.officialMatchFinalists || 0) - (a.officialMatchFinalists || 0))[0];
  const titleGap = teams[1] ? teams[0].communityPoints - teams[1].communityPoints : 0;

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <div className="glass rounded-lg p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="font-rajdhani text-sm font-bold uppercase tracking-[0.25em] text-gold">Season Intel</p>
              <h2 className="font-rajdhani text-4xl font-bold uppercase text-white">Performance Leaders</h2>
            </div>
            <TrendingUp className="h-7 w-7 shrink-0 text-red-400" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <InsightCard icon={<Crosshair />} label="Kills Leader" team={topKiller} value={`${topKiller?.kills.toLocaleString() || 0} kills`} />
            <InsightCard icon={<Award />} label="Runner-Up Leader" team={runnerUpLeader} value={`${runnerUpLeader?.runnerUp || 0} runner-up finishes`} />
            <InsightCard icon={<Flame />} label="Official Finalist" team={officialLeader} value={`${officialLeader?.officialMatchFinalists || 0} official results`} />
          </div>
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
              "Free Fire MAX official finalist x 100"
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

function InsightCard({ icon, label, team, value }: { icon: React.ReactNode; label: string; team?: RankedTeam; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/35 p-4">
      <div className="mb-4 flex items-center justify-between text-gold [&_svg]:h-5 [&_svg]:w-5">
        {icon}
        <span className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</span>
      </div>
      {team && (
        <div className="flex items-center gap-3">
          <TeamLogo src={team.logoUrl} name={team.teamName} size={44} champion={team.rank === 1} />
          <div>
            <p className="font-semibold text-white">{team.teamName}</p>
            <p className="text-sm text-gold">{value}</p>
          </div>
        </div>
      )}
    </div>
  );
}
