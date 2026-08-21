import type { RawTeam, RankedTeam } from "./types";

export const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function calculateCommunityPoints(team: RawTeam) {
  const top5Finishes = team.top5Finishes || 0;
  const finalistFinishes = team.finalistFinishes || team.grandFinals || 0;
  const officialMatchFinalists = team.officialMatchFinalists || 0;

  return (
    team.championships * 100 +
    team.runnerUp * 70 +
    team.secondRunnerUp * 50 +
    top5Finishes * 25 +
    finalistFinishes * 15 +
    officialMatchFinalists * 100 +
    (team.approvedSubmissionPoints || 0)
  );
}

export function getEventsPlayed(team: RawTeam) {
  return team.eventsPlayed || team.championships + team.runnerUp + team.secondRunnerUp + (team.top5Finishes || 0) + (team.finalistFinishes || team.grandFinals || 0) + (team.officialMatchFinalists || 0);
}

export function rankTeams(teams: RawTeam[]): RankedTeam[] {
  const ranked = teams
    .map((team, index) => ({
      ...team,
      previousRank: Math.max(1, index + 1 + ((index % 5) - 2)),
      communityPoints: calculateCommunityPoints(team),
      top3Finishes: team.championships + team.runnerUp + team.secondRunnerUp,
      slug: slugify(team.teamName),
      badge: team.status === "Banned" ? "Banned" : team.status === "Inactive" ? "Inactive" : team.championships >= 4 ? "Elite" : team.runnerUp >= 4 ? "Runner-Up Threat" : (team.officialMatchFinalists || 0) > 0 ? "Official Finalist" : "Contender",
      lastUpdated: new Date().toISOString()
    }))
    .sort((a, b) => {
      if (b.communityPoints !== a.communityPoints) return b.communityPoints - a.communityPoints;
      if (b.championships !== a.championships) return b.championships - a.championships;
      if (b.runnerUp !== a.runnerUp) return b.runnerUp - a.runnerUp;
      if (b.secondRunnerUp !== a.secondRunnerUp) return b.secondRunnerUp - a.secondRunnerUp;
      if ((b.top5Finishes || 0) !== (a.top5Finishes || 0)) return (b.top5Finishes || 0) - (a.top5Finishes || 0);
      return getEventsPlayed(a) - getEventsPlayed(b);
    });

  return ranked.map((team, index) => ({ ...team, rank: index + 1 }));
}

export const rankMovement = (team: RankedTeam) => team.previousRank - team.rank;
