import { Award, BarChart3, Swords, Users, type LucideIcon } from "lucide-react";
import { RankedTeam } from "@/lib/types";

export function StatsCards({ teams }: { teams: RankedTeam[] }) {
  const totalChampionships = teams.reduce((sum, team) => sum + team.championships, 0);
  const totalPoints = teams.reduce((sum, team) => sum + team.communityPoints, 0);
  const totalPlayers = teams.reduce((sum, team) => sum + (team.players || 5), 0);

  const stats: [string, string, LucideIcon][] = [
    ["Total Teams", teams.length.toString(), Users],
    ["Total Championships", totalChampionships.toString(), Award],
    ["Total Community Points", totalPoints.toLocaleString(), BarChart3],
    ["Total Registered Players", totalPlayers.toString(), Swords]
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value, Icon]) => (
          <div key={label} className="glass rounded-lg p-5">
            <Icon className="mb-4 h-6 w-6 text-gold" />
            <div className="font-rajdhani text-3xl font-bold text-white">{value}</div>
            <div className="text-sm uppercase tracking-[0.16em] text-slate-500">{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
