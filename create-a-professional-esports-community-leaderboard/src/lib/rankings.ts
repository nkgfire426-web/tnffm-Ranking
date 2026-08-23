import type { RawTeam, RankedTeam } from "./types";
import type { EventResult, TrackedEvent } from "./events";

export const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function calculateCommunityPoints(team: RawTeam) {
  return Number(team.championships || 0) * 100 + Number(team.runnerUp || 0) * 70 + Number(team.secondRunnerUp || 0) * 50 + Number(team.top5Finishes || 0) * 25 + Number(team.finalistFinishes || 0) * 15 + Number(team.officialMatchFinalists || 0) * 100 + Number(team.approvedSubmissionPoints || 0);
}

export function getEventsPlayed(team: RawTeam) { return Number(team.eventsPlayed || 0); }

function prizeValue(prize: string) {
  if (String(prize).toLowerCase().includes("official")) return Number.POSITIVE_INFINITY;
  return Number(String(prize).replace(/[^0-9.]/g, "")) || 0;
}

function automaticBadge(team: RawTeam) {
  return team.status === "Banned" ? "Banned" : team.status === "Inactive" ? "Inactive" : Number(team.championships || 0) >= 4 ? "Elite" : Number(team.runnerUp || 0) >= 4 ? "Runner-Up Threat" : Number(team.officialMatchFinalists || 0) > 0 ? "Official Finalist" : "Contender";
}

export function isRankingEligible(team: RawTeam) { return team.rankingEligible === true || (team.rankingEligible == null && calculateCommunityPoints(team) > 0); }

function eventCounts(event: TrackedEvent) { return event.published === true && Boolean(event.results?.length) && prizeValue(event.prize) > 1000; }

export function buildTeamsFromPublishedResults(teams: RawTeam[], events: TrackedEvent[]): RawTeam[] {
  const bySlug = new Map<string, RawTeam>();
  const byName = new Map<string, string>();
  teams.forEach((team) => {
    const copy: RawTeam = { ...team, kills: 0, booyahs: 0, championships: 0, runnerUp: 0, secondRunnerUp: 0, top5Finishes: 0, finalistFinishes: 0, officialMatchFinalists: 0, eventsPlayed: 0, grandFinals: 0, positionPoints: 0, totalPoints: 0, matchesPlayed: 0, winRate: 0, killRatio: 0, booyahRatio: 0, rankingEligible: false };
    const slug = slugify(team.teamName);
    bySlug.set(slug, copy);
    byName.set(team.teamName.trim().toLowerCase(), slug);
  });

  events.filter(eventCounts).forEach((event) => {
    const matches = Math.max(0, Number(event.matchesPlayed || 0));
    (event.results || []).forEach((result: EventResult) => {
      const resultSlug = result.teamSlug || byName.get(result.teamName.trim().toLowerCase()) || slugify(result.teamName);
      let team = bySlug.get(resultSlug);
      if (!team) {
        team = { teamName: result.teamName, logoUrl: "", kills: 0, booyahs: 0, championships: 0, runnerUp: 0, secondRunnerUp: 0, grandFinals: 0, winRate: 0, killRatio: 0, booyahRatio: 0, rankingEligible: false, top5Finishes: 0, finalistFinishes: 0, officialMatchFinalists: 0, eventsPlayed: 0, positionPoints: 0, totalPoints: 0, matchesPlayed: 0 };
        bySlug.set(resultSlug, team);
      }
      team.eventsPlayed = Number(team.eventsPlayed || 0) + 1;
      team.grandFinals = Number(team.grandFinals || 0) + 1;
      team.kills = Number(team.kills || 0) + Number(result.kills || 0);
      team.booyahs = Number(team.booyahs || 0) + Number(result.booyahs || 0);
      team.positionPoints = Number(team.positionPoints || 0) + Number(result.positionPoints || 0);
      team.totalPoints = Number(team.totalPoints || 0) + Number(result.total || 0);
      team.matchesPlayed = Number(team.matchesPlayed || 0) + matches;
      team.rankingEligible = true;
      if (result.rank === 1) team.championships = Number(team.championships || 0) + 1;
      else if (result.rank === 2) team.runnerUp = Number(team.runnerUp || 0) + 1;
      else if (result.rank === 3) team.secondRunnerUp = Number(team.secondRunnerUp || 0) + 1;
      if (result.rank <= 5) team.top5Finishes = Number(team.top5Finishes || 0) + 1;
      else if (result.rank <= 18) team.finalistFinishes = Number(team.finalistFinishes || 0) + 1;
    });
  });

  bySlug.forEach((team) => {
    const matches = Number(team.matchesPlayed || 0);
    team.killRatio = matches > 0 ? Number(team.kills || 0) / matches : 0;
    team.booyahRatio = matches > 0 ? (Number(team.booyahs || 0) / matches) * 100 : 0;
    team.winRate = team.booyahRatio || 0;
  });
  return Array.from(bySlug.values());
}

export function rankTeams(teams: RawTeam[], events: TrackedEvent[] = []): RankedTeam[] {
  const hasPublishedResults = events.some(eventCounts);
  const calculatedTeams = hasPublishedResults ? buildTeamsFromPublishedResults(teams, events) : teams;
  const eligibleTeams = calculatedTeams.filter((team) => isRankingEligible(team) && team.status !== "Banned");
  const ranked = eligibleTeams.map((team, index) => ({
    ...team,
    previousRank: Math.max(1, Number((team as any).previousRank || index + 1)),
    communityPoints: calculateCommunityPoints(team),
    eventsPlayed: getEventsPlayed(team),
    top3Finishes: Number(team.championships || 0) + Number(team.runnerUp || 0) + Number(team.secondRunnerUp || 0),
    slug: slugify(team.teamName),
    badge: String((team as any).badge || "").trim() || automaticBadge(team),
    lastUpdated: new Date().toISOString()
  })).sort((a, b) => {
    if (b.communityPoints !== a.communityPoints) return b.communityPoints - a.communityPoints;
    if (b.totalPoints !== a.totalPoints) return Number(b.totalPoints || 0) - Number(a.totalPoints || 0);
    if (b.kills !== a.kills) return b.kills - a.kills;
    if (b.championships !== a.championships) return b.championships - a.championships;
    return a.teamName.localeCompare(b.teamName);
  });
  return ranked.map((team, index) => ({ ...team, rank: index + 1 }));
}

export const rankMovement = (team: RankedTeam) => team.previousRank - team.rank;
