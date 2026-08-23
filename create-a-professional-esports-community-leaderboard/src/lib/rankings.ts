import type { RawTeam, RankedTeam } from "./types";

export const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function calculateCommunityPoints(team: RawTeam) {
  const top5Finishes = Number(team.top5Finishes || 0);
  const finalistFinishes = Number(team.finalistFinishes || team.grandFinals || 0);
  const officialMatchFinalists = Number(team.officialMatchFinalists || 0);

  return (
    Number(team.championships || 0) * 100 +
    Number(team.runnerUp || 0) * 70 +
    Number(team.secondRunnerUp || 0) * 50 +
    top5Finishes * 25 +
    finalistFinishes * 15 +
    officialMatchFinalists * 100 +
    Number(team.approvedSubmissionPoints || 0)
  );
}

export function getEventsPlayed(team: RawTeam) {
  return Number(team.eventsPlayed || 0);
}

function automaticBadge(team: RawTeam) {
  return team.status === "Banned"
    ? "Banned"
    : team.status === "Inactive"
      ? "Inactive"
      : Number(team.championships || 0) >= 4
        ? "Elite"
        : Number(team.runnerUp || 0) >= 4
          ? "Runner-Up Threat"
          : Number(team.officialMatchFinalists || 0) > 0
            ? "Official Finalist"
            : "Contender";
}

/**
 * Official ranking is deliberately separate from the registered-team directory.
 * A team is ranked only when rankingEligible is explicitly true. For legacy
 * data, existing teams with real ranking points remain visible; new registered
 * teams with zero points stay in the community showcase until an official
 * collaborator event result is added.
 */
export function isRankingEligible(team: RawTeam) {
  return team.rankingEligible === true || (team.rankingEligible == null && calculateCommunityPoints(team) > 0);
}

export function rankTeams(teams: RawTeam[]): RankedTeam[] {
  const eligibleTeams = teams.filter((team) => isRankingEligible(team) && team.status !== "Banned");

  const ranked = eligibleTeams
    .map((team, index) => ({
      ...team,
      previousRank: Math.max(1, index + 1),
      communityPoints: calculateCommunityPoints(team),
      eventsPlayed: getEventsPlayed(team),
      top3Finishes: Number(team.championships || 0) + Number(team.runnerUp || 0) + Number(team.secondRunnerUp || 0),
      slug: slugify(team.teamName),
      badge: String((team as any).badge || "").trim() || automaticBadge(team),
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
