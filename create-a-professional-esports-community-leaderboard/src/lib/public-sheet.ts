import { getRegisteredTeams } from "./google-sheets";
import type { RawTeam } from "./types";
import { slugify } from "./rankings";

/**
 * Public team pages use the same canonical Google Sheets reader as the rest of
 * the site. This avoids a second independent webhook fetch with a separate
 * 20-second timeout and lets public team pages share the short-lived in-flight
 * request/cache used by the homepage and ranking pages.
 */
export async function getPublicRegisteredTeams(): Promise<RawTeam[]> {
  if (!process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim()) {
    throw new Error("Google Sheets is not configured.");
  }
  return getRegisteredTeams();
}

export async function getPublicRegisteredTeamBySlug(slug: string) {
  const teams = await getPublicRegisteredTeams();
  const normalized = String(slug || "").trim().toLowerCase();
  return teams.find(
    (team) =>
      slugify(team.teamName) === normalized ||
      String((team as any).slug || "").toLowerCase() === normalized
  );
}
