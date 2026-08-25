import { getRankedTeams, getRegisteredTeams } from "./google-sheets";
import type { RankedTeam, RawTeam } from "./types";
import { slugify } from "./rankings";

const text = (value: unknown) => String(value ?? "").trim();
const numberOr = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

function mergeProfile(ranking: RankedTeam, profile?: RawTeam): RankedTeam {
  if (!profile) return ranking;
  // Published Community Rankings owns every ranking/stat field. Registered Teams/Rosters
  // may only supply current profile fields. Never spread profile over ranking fields.
  return {
    ...ranking,
    teamName: ranking.teamName,
    logoUrl: text(profile.logoUrl) || ranking.logoUrl,
    bannerUrl: text(profile.bannerUrl) || ranking.bannerUrl,
    description: text(profile.description) || ranking.description,
    mobileNumber: text(profile.mobileNumber) || ranking.mobileNumber,
    registrationStatus: profile.registrationStatus || ranking.registrationStatus,
    status: profile.status || ranking.status,
    roster: Array.isArray(profile.roster) ? profile.roster : (ranking.roster || []),
    players: profile.players != null ? numberOr(profile.players, profile.roster?.length || ranking.players || 0) : (profile.roster?.length || ranking.players || 0),
    slug: ranking.slug || slugify(ranking.teamName),
    lastUpdated: text(ranking.lastUpdated) || text((profile as any).lastUpdated),
  };
}

function buildProfileMaps(registered: RawTeam[]) {
  const byId = new Map<string, RawTeam>();
  const byName = new Map<string, RawTeam>();
  for (const team of registered) {
    const id = text((team as any).teamId ?? (team as any).id);
    const name = text(team.teamName).toLowerCase();
    if (id) byId.set(id, team);
    if (name) byName.set(name, team);
  }
  return { byId, byName };
}

/** Official ranking: every returned record comes from Community Rankings. */
export async function getUnifiedTeamData(): Promise<RankedTeam[]> {
  const [ranked, registered] = await Promise.all([getRankedTeams(), getRegisteredTeams()]);
  const { byId, byName } = buildProfileMaps(registered);
  return ranked.map((ranking) => {
    const profile = byId.get(text((ranking as any).teamId)) || byName.get(text(ranking.teamName).toLowerCase());
    return mergeProfile(ranking, profile);
  });
}

/** Public team profiles: every registered team, with published ranking data added when available. */
export async function getPublicTeamData(): Promise<RankedTeam[]> {
  const [ranked, registered] = await Promise.all([getRankedTeams(), getRegisteredTeams()]);
  const { byId: profileById, byName: profileByName } = buildProfileMaps(registered);
  const rankedById = new Map<string, RankedTeam>();
  const rankedByName = new Map<string, RankedTeam>();
  for (const ranking of ranked) {
    const id = text((ranking as any).teamId);
    const name = text(ranking.teamName).toLowerCase();
    if (id) rankedById.set(id, ranking);
    if (name) rankedByName.set(name, ranking);
  }

  return registered.map((profile) => {
    const id = text((profile as any).teamId ?? (profile as any).id);
    const name = text(profile.teamName).toLowerCase();
    const ranking = (id && rankedById.get(id)) || rankedByName.get(name);
    if (ranking) return mergeProfile(ranking, profile);

    return {
      ...profile,
      teamName: profile.teamName,
      logoUrl: profile.logoUrl || "",
      bannerUrl: profile.bannerUrl || "",
      description: profile.description || "",
      roster: Array.isArray(profile.roster) ? profile.roster : [],
      players: profile.players != null ? numberOr(profile.players, profile.roster?.length || 0) : (profile.roster?.length || 0),
      slug: slugify(profile.teamName),
      rank: 0, previousRank: 0, communityPoints: 0, top3Finishes: 0, badge: "",
      lastUpdated: text((profile as any).lastUpdated),
      championships: numberOr(profile.championships), runnerUp: numberOr(profile.runnerUp),
      secondRunnerUp: numberOr(profile.secondRunnerUp), top5Finishes: numberOr(profile.top5Finishes),
      finalistFinishes: numberOr(profile.finalistFinishes), officialMatchFinalists: numberOr(profile.officialMatchFinalists),
      eventsPlayed: numberOr(profile.eventsPlayed), grandFinals: numberOr(profile.grandFinals),
      kills: numberOr(profile.kills), booyahs: numberOr(profile.booyahs), winRate: numberOr(profile.winRate),
      killRatio: numberOr(profile.killRatio), booyahRatio: numberOr(profile.booyahRatio),
      positionPoints: numberOr(profile.positionPoints), totalPoints: numberOr(profile.totalPoints),
      matchesPlayed: numberOr(profile.matchesPlayed), approvedSubmissionPoints: numberOr(profile.approvedSubmissionPoints),
      rankingEligible: Boolean(profile.rankingEligible),
    } as RankedTeam;
  });
}

export async function getUnifiedTeamBySlug(slug: string) {
  const normalized = text(slug);
  const teams = await getPublicTeamData();
  return teams.find((team) => slugify(team.teamName) === normalized || text((team as any).slug) === normalized);
}
