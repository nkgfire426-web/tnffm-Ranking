import type { RawTeam } from "./types";
import { slugify } from "./rankings";

const PUBLIC_SHEET_TIMEOUT_MS = 20000;

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeRoster(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((player: any) => ({
        playerId: String(player?.playerId ?? player?.id ?? "").trim(),
        name: String(player?.name ?? player?.Name ?? "").trim(),
        uid: String(player?.uid ?? player?.UID ?? player?.Uid ?? "").trim(),
        role: String(player?.role ?? player?.Role ?? "").trim(),
        playerLogoUrl: String(player?.playerLogoUrl ?? player?.PlayerLogoURL ?? player?.logoUrl ?? "").trim() || undefined,
        status: String(player?.status ?? player?.Status ?? "Active").trim() || "Active",
      }))
      .filter((player) => player.name || player.uid || player.playerLogoUrl);
  }
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  try { return normalizeRoster(JSON.parse(raw)); } catch { return []; }
}

function normalizeTeam(input: Record<string, any>): RawTeam {
  const teamName = String(input.teamName ?? input["Team Name"] ?? input.Team ?? input.team ?? "").trim();
  const roster = normalizeRoster(input.roster ?? input.Roster);
  return {
    ...input,
    teamName,
    slug: String(input.slug ?? input.Slug ?? slugify(teamName)).trim() || slugify(teamName),
    logoUrl: String(input.logoUrl ?? input["Logo URL"] ?? input.LogoURL ?? "").trim(),
    bannerUrl: String(input.bannerUrl ?? input["Banner URL"] ?? "").trim(),
    description: String(input.description ?? input.Description ?? "").trim(),
    mobileNumber: String(input.mobileNumber ?? input["Mobile Number"] ?? "").trim(),
    status: String(input.status ?? input.Status ?? "Active").trim() || "Active",
    registrationStatus: input.registrationStatus ?? input["Registration Status"] ?? input.RegistrationStatus ?? "Registered",
    roster,
    players: roster.length || Math.max(0, asNumber(input.players ?? input.Players, 0)),
    kills: Math.max(0, asNumber(input.kills ?? input.Kills, 0)),
    booyahs: Math.max(0, asNumber(input.booyahs ?? input.Booyahs, 0)),
    championships: Math.max(0, asNumber(input.championships ?? input.Championships, 0)),
    runnerUp: Math.max(0, asNumber(input.runnerUp ?? input.RunnerUp, 0)),
    secondRunnerUp: Math.max(0, asNumber(input.secondRunnerUp ?? input.SecondRunnerUp, 0)),
    top5Finishes: Math.max(0, asNumber(input.top5Finishes ?? input.Top5Finishes, 0)),
    finalistFinishes: Math.max(0, asNumber(input.finalistFinishes ?? input.FinalistFinishes, 0)),
    officialMatchFinalists: Math.max(0, asNumber(input.officialMatchFinalists ?? input.OfficialMatchFinalists, 0)),
    eventsPlayed: Math.max(0, asNumber(input.eventsPlayed ?? input.EventsPlayed, 0)),
    grandFinals: Math.max(0, asNumber(input.grandFinals ?? input.GrandFinals, 0)),
    matchesPlayed: Math.max(0, asNumber(input.matchesPlayed ?? input.MatchesPlayed, 0)),
    positionPoints: Math.max(0, asNumber(input.positionPoints ?? input.PositionPoints, 0)),
    totalPoints: Math.max(0, asNumber(input.totalPoints ?? input.TotalPoints, 0)),
    winRate: asNumber(input.winRate ?? input["Win Rate"], 0),
    killRatio: asNumber(input.killRatio ?? input["Kill Ratio"], 0),
    booyahRatio: asNumber(input.booyahRatio ?? input["Booyah Ratio"], 0),
    lastUpdated: String(input.lastUpdated ?? input["Updated At"] ?? input.UpdatedAt ?? "").trim(),
  } as RawTeam;
}

export async function getPublicRegisteredTeams(): Promise<RawTeam[]> {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim();
  if (!webhookUrl) throw new Error("Google Sheets is not configured.");

  const url = new URL(webhookUrl);
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec\/?$/i.test(url.origin + url.pathname)) {
    throw new Error("Google Sheets webhook must be the current Apps Script /exec URL.");
  }
  url.searchParams.set("_tnffm_public_teams", `${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PUBLIC_SHEET_TIMEOUT_MS);
  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json", "Cache-Control": "no-cache, no-store, max-age=0", Pragma: "no-cache" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Google Apps Script returned HTTP ${response.status}.`);
    const payload = await response.json();
    if (!payload || payload.ok === false) throw new Error(String(payload?.message || "Google Apps Script returned an unsuccessful response."));
    if (!Array.isArray(payload.teams)) throw new Error("Google Apps Script response does not contain the Teams data.");

    return payload.teams
      .map((team: Record<string, any>) => normalizeTeam(team))
      .filter((team: any) => String(team.registrationStatus ?? "Registered").trim().toLowerCase() !== "hidden");
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("Google Sheets team read timed out after 20 seconds.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getPublicRegisteredTeamBySlug(slug: string) {
  const teams = await getPublicRegisteredTeams();
  const normalized = String(slug || "").trim().toLowerCase();
  return teams.find((team) => slugify(team.teamName) === normalized || String((team as any).slug || "").toLowerCase() === normalized);
}
