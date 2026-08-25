import { getRankedTeams, getRegisteredTeams } from "./google-sheets";
import type { RankedTeam, RawTeam } from "./types";
import { slugify } from "./rankings";

/** One public team model for every page. Rankings own ranking fields; Teams/Rosters own profile fields. */
export async function getUnifiedTeamData(): Promise<RankedTeam[]> {
  const [ranked, registered] = await Promise.all([getRankedTeams(), getRegisteredTeams()]);
  const byId = new Map<string, RawTeam>();
  const byName = new Map<string, RawTeam>();

  for (const team of registered) {
    const id = String((team as any).teamId ?? (team as any).id ?? "").trim();
    const name = String(team.teamName ?? "").trim().toLowerCase();
    if (id) byId.set(id, team);
    if (name) byName.set(name, team);
  }

  return ranked.map((ranking) => {
    const profile =
      byId.get(String((ranking as any).teamId ?? "").trim()) ||
      byName.get(String(ranking.teamName ?? "").trim().toLowerCase());
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
  });
}

export async function getUnifiedTeamBySlug(slug: string) {
  const normalized = String(slug || "").trim();
  const teams = await getUnifiedTeamData();
  return teams.find((team) => slugify(team.teamName) === normalized || String((team as any).slug || "") === normalized);
}
