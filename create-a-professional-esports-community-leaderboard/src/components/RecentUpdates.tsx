import { Clock, Flame, type LucideIcon } from "lucide-react";
import { RankedTeam } from "@/lib/types";

export function RecentUpdates({ teams }: { teams: RankedTeam[] }) {
  const updates: { team: RankedTeam; text: string; Icon: LucideIcon }[] = teams.slice(0, 5).map((team, index) => ({
    team,
    text: index === 0 ? "secured the community crown" : index % 2 ? "gained ranking momentum" : "qualified for grand finals tracking",
    Icon: Flame
  }));

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="glass rounded-lg p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="font-rajdhani text-sm font-bold uppercase tracking-[0.25em] text-gold">Recent Updates</p>
            <h2 className="font-rajdhani text-3xl font-bold uppercase text-white">Ranking Feed</h2>
          </div>
          <Clock className="h-6 w-6 text-red-400" />
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {updates.map(({ team, text, Icon }) => (
            <div key={team.slug} className="rounded-lg border border-white/10 bg-black/30 p-4">
              <Icon className="mb-3 h-5 w-5 text-gold" />
              <p className="text-sm text-slate-300">
                <span className="font-semibold text-white">{team.teamName}</span> {text}.
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.14em] text-slate-500">Rank #{team.rank}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
