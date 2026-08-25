import { getRankedTeams, getRegisteredTeams } from "./google-sheets";
import type { RankedTeam, RawTeam } from "./types";
import { slugify } from "./rankings";

/**
 * One public team model for every page.
 *
 * Google Sheets has two logical views:
 * - Community Rankings: authoritative for rank/score/competitive history.
 * - Registered Teams: authoritative for the current team profile/roster.
 *
 * This function deliberately combines those views without letting a ranking
 * row containing empty/default profile values erase good registration data.
 */
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

    // Profile fields always come from the Registered Teams record.
    // Ranking fields remain from the published ranking record.
    return {
      ...ranking,
      teamName: profile.teamName || ranking.teamName,
      slug: (profile as any).slug || ranking.slug || slugify(profile.teamName),
      logoUrl: profile.logoUrl || ranking.logoUrl,
      bannerUrl: profile.bannerUrl || ranking.bannerUrl,
      players: profile.players || ranking.players || profile.roster?.length || 0,
      roster: profile.roster?.length ? profile.roster : ranking.roster || [],
      status: profile.status || ranking.status,
      registrationStatus: profile.registrationStatus || ranking.registrationStatus,
      description: profile.description || ranking.description,
      mobileNumber: profile.mobileNumber || ranking.mobileNumber,
      lastUpdated: profile.lastUpdated || ranking.lastUpdated,
    } as RankedTeam;
  });
}

export async function getUnifiedTeamBySlug(slug: string) {
  const normalized = String(slug || "").trim();
  const teams = await getUnifiedTeamData();
  return teams.find(
    (team) => slugify(team.teamName) === normalized || String((team as any).slug || "") === normalized
  );
}
