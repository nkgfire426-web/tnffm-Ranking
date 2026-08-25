import { getRankedTeams, getRegisteredTeams } from "./google-sheets";
import type { RankedTeam, RawTeam } from "./types";
import { slugify } from "./rankings";

function mergeProfile(ranking: RankedTeam, profile?: RawTeam): RankedTeam {
  if (!profile) return ranking;

  return {
    ...ranking,
    teamName: profile.teamName || ranking.teamName,
    slug: (profile as any).slug || ranking.slug || slugify(profile.teamName),
    logoUrl: profile.logoUrl || ranking.logoUrl,
    bannerUrl: profile.bannerUrl || ranking.bannerUrl,
    players: Number((profile as any).players) || ranking.players || profile.roster?.length || 0,
    roster: profile.roster?.length ? profile.roster : ranking.roster || [],
    status: (profile as any).status || ranking.status,
    registrationStatus: (profile as any).registrationStatus || ranking.registrationStatus,
    description: (profile as any).description || ranking.description,
    mobileNumber: (profile as any).mobileNumber || ranking.mobileNumber,
    lastUpdated: String((profile as any).lastUpdated ?? (ranking as any).lastUpdated ?? ""),
  } as RankedTeam;
}

function buildProfileMaps(registered: RawTeam[]) {
  const byId = new Map<string, RawTeam>();
  const byName = new Map<string, RawTeam>();
  for (const team of registered) {
    const id = String((team as any).teamId ?? (team as any).id ?? "").trim();
    const name = String(team.teamName ?? "").trim().toLowerCase();
    if (id) byId.set(id, team);
    if (name) byName.set(name, team);
  }
  return { byId, byName };
}

/** Official ranking only: every returned record exists in Community Rankings. */
export async function getUnifiedTeamData(): Promise<RankedTeam[]> {
  const [ranked, registered] = await Promise.all([getRankedTeams(), getRegisteredTeams()]);
  const { byId, byName } = buildProfileMaps(registered);

  return ranked.map((ranking) => {
    const profile =
      byId.get(String((ranking as any).teamId ?? "").trim()) ||
      byName.get(String(ranking.teamName ?? "").trim().toLowerCase());
    return mergeProfile(ranking, profile);
  });
}

/** Public team profiles: all registered teams, with ranking data merged when available. */
export async function getPublicTeamData(): Promise<RankedTeam[]> {
  const [ranked, registered] = await Promise.all([getRankedTeams(), getRegisteredTeams()]);
  const { byId, byName } = buildProfileMaps(registered);
  const rankedById = new Map<string, RankedTeam>();
  const rankedByName = new Map<string, RankedTeam>();

  for (const ranking of ranked) {
    const id = String((ranking as any).teamId ?? "").trim();
    const name = String(ranking.teamName ?? "").trim().toLowerCase();
    if (id) rankedById.set(id, ranking);
    if (name) rankedByName.set(name, ranking);
  }

  const result: RankedTeam[] = registered.map((profile) => {
    const id = String((profile as any).teamId ?? (profile as any).id ?? "").trim();
    const name = String(profile.teamName ?? "").trim().toLowerCase();
    const ranking = (id && rankedById.get(id)) || rankedByName.get(name);
    if (ranking) return mergeProfile(ranking, profile);

    return {
      ...profile,
      teamName: profile.teamName,
      logoUrl: profile.logoUrl || "",
      slug: (profile as any).slug || slugify(profile.teamName),
      rank: 0,
      previousRank: 0,
      communityPoints: 0,
      top3Finishes: 0,
      badge: "",
      lastUpdated: String((profile as any).lastUpdated ?? ""),
      championships: Number(profile.championships) || 0,
      runnerUp: Number(profile.runnerUp) || 0,
      secondRunnerUp: Number(profile.secondRunnerUp) || 0,
      grandFinals: Number(profile.grandFinals) || 0,
      kills: Number(profile.kills) || 0,
      booyahs: Number(profile.booyahs) || 0,
      winRate: Number(profile.winRate) || 0,
      killRatio: Number(profile.killRatio) || 0,
      rankingEligible: Boolean(profile.rankingEligible),
    } as RankedTeam;
  });

  return result;
}

export async function getUnifiedTeamBySlug(slug: string) {
  const normalized = String(slug || "").trim();
  const teams = await getPublicTeamData();
  return teams.find((team) => slugify(team.teamName) === normalized || String((team as any).slug || "") === normalized);
}
