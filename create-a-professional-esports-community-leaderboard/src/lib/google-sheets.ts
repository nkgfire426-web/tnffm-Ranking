import { rankTeams, slugify } from "./rankings";
import type { RawTeam, RankedTeam } from "./types";
import { getTrackedEvents } from "./events";
import crypto from "crypto";
import {
  getCachedSheetPayload,
  getLastSheetPayload,
  getSheetReadInFlight,
  setCachedSheetPayload,
  setSheetReadInFlight,
} from "./sheet-cache";

export type TournamentNews = {
  id?: string;
  title: string;
  description?: string;
  date?: string;
  type?: string;
  status?: string;
  imageUrl?: string;
  link?: string;
};

const SHEET_TIMEOUT_MS = 15000;

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function firstValue(input: Record<string, any>, ...keys: string[]) {
  for (const key of keys) {
    const value = input?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return undefined;
}

function numericFallback(input: Record<string, any>, keys: string[], fallback = 0) {
  for (const key of keys) {
    const n = Number(input?.[key]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return fallback;
}

function normalizeUrl(url: unknown) {
  const value = String(url ?? "").trim();
  if (!value) return "";
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? value : "";
  } catch {
    return "";
  }
}

function normalizeLogo(url: unknown) {
  return normalizeUrl(url);
}

function normalizeRoster(value: unknown): { name: string; uid: string; role?: string; playerLogoUrl?: string; playerId?: string; status?: string; createdAt?: string; updatedAt?: string }[] {
  if (Array.isArray(value)) {
    return value
      .map((player: any) => ({
        playerId: String(player?.playerId ?? player?.PlayerID ?? player?.["Player ID"] ?? "").trim() || undefined,
        name: String(player?.name ?? player?.Name ?? player?.playerName ?? player?.["Player Name"] ?? "").trim(),
        uid: String(player?.uid ?? player?.UID ?? player?.Uid ?? "").trim(),
        role: String(player?.role ?? player?.Role ?? "").trim() || undefined,
        playerLogoUrl:
          normalizeUrl(
            player?.playerLogoUrl ??
              player?.PlayerLogoURL ??
              player?.["Player Logo URL"] ??
              player?.playerLogo ??
              player?.logoUrl ??
              player?.LogoURL ??
              ""
          ) || undefined,
        status: String(player?.status ?? player?.Status ?? "").trim() || undefined,
        createdAt: String(player?.createdAt ?? player?.["Created At"] ?? "").trim() || undefined,
        updatedAt: String(player?.updatedAt ?? player?.["Updated At"] ?? "").trim() || undefined,
      }))
      .filter((player) => player.name || player.uid || player.playerLogoUrl);
  }

  const raw = String(value ?? "").trim();
  if (!raw) return [];
  try {
    return normalizeRoster(JSON.parse(raw));
  } catch {
    return raw
      .split(/\r?\n|\s*[,;]\s*/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((name) => ({ name, uid: "" }));
  }
}

function normalizeTeam(input: Record<string, any>): RawTeam {
  const teamName = String(firstValue(input, "teamName", "Team", "team", "Team Name") ?? "").trim();
  const roster = normalizeRoster(firstValue(input, "roster", "Roster"));
  const matches = Math.max(0, asNumber(firstValue(input, "matchesPlayed", "MatchesPlayed", "Matches Played"), 0));
  const kills = Math.max(0, asNumber(firstValue(input, "kills", "Kills"), 0));
  const booyahs = Math.max(0, asNumber(firstValue(input, "booyahs", "Booyahs"), 0));

  return {
    ...input,
    teamName,
    slug: String(firstValue(input, "slug", "Slug") ?? slugify(teamName)).trim() || slugify(teamName),
    logoUrl: normalizeLogo(firstValue(input, "logoUrl", "Logo URL", "LogoURL")),
    bannerUrl: normalizeUrl(firstValue(input, "bannerUrl", "Banner URL", "BannerURL")),
    players: roster.length || Math.max(0, asNumber(firstValue(input, "players", "Players"), 0)),
    roster,
    status: String(firstValue(input, "status", "Status") ?? "Active"),
    registrationStatus: firstValue(input, "registrationStatus", "RegistrationStatus", "Registration Status") ?? "Registered",
    description: String(firstValue(input, "description", "Description") ?? ""),
    mobileNumber: String(firstValue(input, "mobileNumber", "Mobile Number") ?? "").trim(),
    kills,
    booyahs,
    championships: Math.max(0, numericFallback(input, ["championships", "Championships"])),
    runnerUp: Math.max(0, numericFallback(input, ["runnerUp", "RunnerUp", "Runner-Up"])),
    secondRunnerUp: Math.max(0, numericFallback(input, ["secondRunnerUp", "SecondRunnerUp", "2nd Runner-Up"])),
    top5Finishes: Math.max(0, numericFallback(input, ["top5Finishes", "Top5Finishes", "Top 5 Finishes"])),
    finalistFinishes: Math.max(0, numericFallback(input, ["finalistFinishes", "FinalistFinishes", "Finalist"])),
    officialMatchFinalists: Math.max(0, numericFallback(input, ["officialMatchFinalists", "OfficialMatchFinalists"])),
    eventsPlayed: Math.max(0, numericFallback(input, ["eventsPlayed", "EventsPlayed", "Events Played"])),
    grandFinals: Math.max(0, numericFallback(input, ["grandFinals", "GrandFinals", "Grand Finals"])),
    matchesPlayed: matches,
    positionPoints: Math.max(0, numericFallback(input, ["positionPoints", "PositionPoints", "Position Points"])),
    totalPoints: Math.max(0, numericFallback(input, ["totalPoints", "TotalPoints", "Total Points"])),
    killRatio: matches > 0 ? kills / matches : 0,
    booyahRatio: matches > 0 ? (booyahs / matches) * 100 : 0,
    winRate: matches > 0 ? (booyahs / matches) * 100 : 0,
    lastUpdated: String(firstValue(input, "lastUpdated", "LastUpdated", "Updated At") ?? ""),
  } as RawTeam;
}

async function readSheetFromWebhook(): Promise<any | null> {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("Google Sheets read error: GOOGLE_SHEETS_WEBHOOK_URL is not configured");
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SHEET_TIMEOUT_MS);

  try {
    const url = new URL(webhookUrl);
    url.searchParams.set("_tnffm_read", `${Date.now()}-${Math.random().toString(36).slice(2)}`);

    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache, no-store, max-age=0",
        Pragma: "no-cache",
      },
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`Google Apps Script returned HTTP ${response.status}`);
    const payload = await response.json();
    if (!payload || payload.ok === false) {
      throw new Error(String(payload?.message || "Google Apps Script returned an unsuccessful response"));
    }

    setCachedSheetPayload(payload);
    return payload;
  } catch (error) {
    console.error("Google Sheets read error after timeout:", error);
    return getLastSheetPayload();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchSheetPayload(): Promise<any | null> {
  const cached = getCachedSheetPayload();
  if (cached) return cached;

  const existingRequest = getSheetReadInFlight();
  if (existingRequest) return existingRequest;

  const request = readSheetFromWebhook().finally(() => setSheetReadInFlight(null));
  setSheetReadInFlight(request);
  return request;
}

export async function getRegisteredTeams(): Promise<RawTeam[]> {
  const payload = await fetchSheetPayload();
  if (!payload || !Array.isArray(payload.teams)) return [];

  return payload.teams
    .map((team: Record<string, any>) => normalizeTeam(team))
    .filter(
      (team: any) =>
        String(team.registrationStatus ?? team.status ?? "Registered").trim().toLowerCase() !== "hidden"
    );
}

export async function getTournamentNews(): Promise<TournamentNews[]> {
  const payload = await fetchSheetPayload();
  if (!payload || !Array.isArray(payload.news)) return [];

  return payload.news
    .map((item: Record<string, any>) => ({
      id: String(firstValue(item, "id", "ID") ?? ""),
      title: String(firstValue(item, "title", "Title") ?? ""),
      description: String(firstValue(item, "description", "Description") ?? ""),
      date: String(firstValue(item, "date", "Date") ?? ""),
      type: String(firstValue(item, "type", "Type") ?? ""),
      status: String(firstValue(item, "status", "Status") ?? "Published"),
      imageUrl: normalizeUrl(firstValue(item, "imageUrl", "ImageURL", "Image URL")),
      link: normalizeUrl(firstValue(item, "link", "Link")),
    }))
    .filter((item: TournamentNews) => String(item.status || "Published").toLowerCase() !== "hidden");
}

export async function getRankedTeams(): Promise<RankedTeam[]> {
  try {
    const payload = await fetchSheetPayload();
    if (!payload) return [];

    const teamsRaw = Array.isArray(payload.teams) ? payload.teams : [];
    const rankingsRaw = Array.isArray(payload.rankings) ? payload.rankings : [];

    const byId = new Map<string, any>(
      teamsRaw
        .map((team: any): [string, any] => [String(team.teamId ?? team.id ?? "").trim(), team])
        .filter(([id]: [string, any]) => Boolean(id))
    );
    const byName = new Map<string, any>(
      teamsRaw
        .map((team: any): [string, any] => [String(team.teamName ?? team.team ?? team["Team Name"] ?? "").trim().toLowerCase(), team])
        .filter(([name]: [string, any]) => Boolean(name))
    );

    if (rankingsRaw.length === 0) return [];

    return rankingsRaw
      .filter((r: any) => String(r?.status ?? r?.Status ?? "Active").toLowerCase() !== "hidden")
      .map((r: any) => {
        const teamId = String(firstValue(r, "teamId", "Team ID", "id") ?? "").trim();
        const rankingTeamName = String(firstValue(r, "teamName", "Team Name", "Team") ?? "").trim();
        const base = byId.get(teamId) || byName.get(rankingTeamName.toLowerCase()) || {};

        const matches = numericFallback(r, ["matchesPlayed", "MatchesPlayed", "Matches Played"], asNumber(firstValue(base, "matchesPlayed", "MatchesPlayed", "Matches Played"), 0));
        const kills = numericFallback(r, ["kills", "Kills"], asNumber(firstValue(base, "kills", "Kills"), 0));
        const booyahs = numericFallback(r, ["booyahs", "Booyahs"], asNumber(firstValue(base, "booyahs", "Booyahs"), 0));
        const rank = numericFallback(r, ["rank", "Rank", "Ranking"], 0);
        const previousRank = numericFallback(r, ["previousRank", "PreviousRank", "Previous Rank"], 0);
        const communityPoints = numericFallback(r, ["communityScore", "Community Score", "communityPoints", "CommunityPoints", "Community Points"], 0);
        const championships = numericFallback(r, ["championships", "Championships"], asNumber(firstValue(base, "championships", "Championships"), 0));
        const runnerUp = numericFallback(r, ["runnerUp", "RunnerUp", "Runner-Up"], asNumber(firstValue(base, "runnerUp", "RunnerUp", "Runner-Up"), 0));
        const secondRunnerUp = numericFallback(r, ["secondRunnerUp", "SecondRunnerUp", "2nd Runner-Up"], asNumber(firstValue(base, "secondRunnerUp", "SecondRunnerUp", "2nd Runner-Up"), 0));
        const top5Finishes = numericFallback(r, ["top5Finishes", "Top5Finishes", "Top 5 Finishes"], asNumber(firstValue(base, "top5Finishes", "Top5Finishes", "Top 5 Finishes"), 0));
        const finalistFinishes = numericFallback(r, ["finalistFinishes", "FinalistFinishes", "Finalist"], asNumber(firstValue(base, "finalistFinishes", "FinalistFinishes", "Finalist"), 0));
        const officialMatchFinalists = numericFallback(r, ["officialMatchFinalists", "OfficialMatchFinalists"], asNumber(firstValue(base, "officialMatchFinalists", "OfficialMatchFinalists"), 0));
        const eventsPlayed = numericFallback(r, ["eventsPlayed", "EventsPlayed", "Events Played"], asNumber(firstValue(base, "eventsPlayed", "EventsPlayed", "Events Played"), 0));
        const grandFinals = numericFallback(r, ["grandFinals", "GrandFinals", "Grand Finals"], asNumber(firstValue(base, "grandFinals", "GrandFinals", "Grand Finals"), 0));
        const positionPoints = numericFallback(r, ["positionPoints", "PositionPoints", "Position Points"], asNumber(firstValue(base, "positionPoints", "PositionPoints", "Position Points"), 0));
        const totalPoints = numericFallback(r, ["totalPoints", "TotalPoints", "Total Points"], asNumber(firstValue(base, "totalPoints", "TotalPoints", "Total Points"), 0));

        return normalizeTeam({
          ...base,
          ...r,
          teamId: teamId || firstValue(base, "teamId", "Team ID", "id") || "",
          teamName: rankingTeamName || firstValue(base, "teamName", "Team", "team", "Team Name") || "",
          slug: firstValue(r, "slug", "Slug") ?? firstValue(base, "slug", "Slug"),
          logoUrl: normalizeLogo(firstValue(r, "logoUrl", "Logo URL", "LogoURL") ?? firstValue(base, "logoUrl", "Logo URL", "LogoURL")),
          bannerUrl: normalizeUrl(firstValue(r, "bannerUrl", "Banner URL", "BannerURL") ?? firstValue(base, "bannerUrl", "Banner URL", "BannerURL")),
          roster: base.roster ?? base.Roster ?? [],
          players: asNumber(firstValue(base, "players", "Players"), 0),
          kills,
          booyahs,
          matchesPlayed: matches,
          eventsPlayed,
          championships,
          runnerUp,
          secondRunnerUp,
          top5Finishes,
          finalistFinishes,
          officialMatchFinalists,
          grandFinals,
          positionPoints,
          totalPoints,
          communityPoints,
          communityScore: communityPoints,
          rank,
          previousRank,
          badge: String(firstValue(r, "badge", "Badge") ?? firstValue(base, "badge", "Badge") ?? ""),
          rankingEligible: String(firstValue(r, "eligible", "Eligible") ?? "Yes").toLowerCase() !== "no" && String(firstValue(r, "eligible", "Eligible") ?? "true").toLowerCase() !== "false",
        });
      })
      .filter((team: any) => team.teamName)
      .sort((a: any, b: any) => {
        const ar = Number(a.rank || 999999);
        const br = Number(b.rank || 999999);
        if (ar !== br) return ar - br;
        return String(a.teamName).localeCompare(String(b.teamName));
      }) as RankedTeam[];
  } catch (error) {
    console.error("Ranking data error:", error);
    return [];
  }
}

export async function getTeamBySlug(slug: string) {
  const teams = await getRegisteredTeams();
  return teams.find((team) => slugify(team.teamName) === slug || (team as any).slug === slug);
}

function base64url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getServiceAccountAccessToken(serviceAccountJson: string) {
  const sa = JSON.parse(serviceAccountJson);
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp,
    iat,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const sign = crypto.createSign("RSA-SHA256");
  const key = sa.private_key.replace(/\\n/g, "\n");
  sign.update(unsigned);
  const signature = sign.sign(key);
  const jwt = `${unsigned}.${base64url(signature)}`;
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(jwt)}`,
  });
  if (!resp.ok) throw new Error(`Service account token request failed: ${resp.status}`);
  const payload = await resp.json();
  return payload.access_token as string;
}

export async function updateGoogleSheetValues(
  sheetId: string,
  range: string,
  rows: Array<string[]>,
  serviceAccountJson: string
) {
  const token = await getServiceAccountAccessToken(serviceAccountJson);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const resp = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: rows }),
  });
  if (!resp.ok) {
    throw new Error(`Google Sheets update failed: ${resp.status} ${await resp.text()}`);
  }
  return await resp.json();
}

export function teamsToSheetRows(teams: Array<RawTeam | RankedTeam>) {
  const header = [
    "Team",
    "Slug",
    "Rank",
    "PreviousRank",
    "CommunityPoints",
    "Badge",
    "Logo URL",
    "Banner URL",
    "Kills",
    "Booyahs",
    "Championships",
    "RunnerUp",
    "SecondRunnerUp",
    "Top5Finishes",
    "FinalistFinishes",
    "OfficialMatchFinalists",
    "EventsPlayed",
    "GrandFinals",
    "WinRate",
    "KillRatio",
    "BooyahRatio",
    "PositionPoints",
    "TotalPoints",
    "MatchesPlayed",
    "Players",
    "Status",
    "Description",
    "LastUpdated",
  ];

  const rows = teams.map((t) => {
    const ranked = t as RankedTeam;
    const matches = Math.max(0, asNumber((t as any).matchesPlayed, 0));
    const kills = Math.max(0, asNumber((t as any).kills, 0));
    const booyahs = Math.max(0, asNumber((t as any).booyahs, 0));
    const killRatio = matches > 0 ? kills / matches : 0;
    const booyahRatio = matches > 0 ? (booyahs / matches) * 100 : 0;

    return [
      t.teamName || "",
      ranked.slug || slugify(t.teamName || "team"),
      String(ranked.rank ?? ""),
      String(ranked.previousRank ?? ""),
      String(ranked.communityPoints ?? ""),
      String(ranked.badge ?? ""),
      normalizeLogo(t.logoUrl),
      normalizeUrl((t as any).bannerUrl),
      String(kills),
      String(booyahs),
      String((t as any).championships ?? 0),
      String((t as any).runnerUp ?? 0),
      String((t as any).secondRunnerUp ?? 0),
      String((t as any).top5Finishes ?? 0),
      String((t as any).finalistFinishes ?? 0),
      String((t as any).officialMatchFinalists ?? 0),
      String((t as any).eventsPlayed ?? 0),
      String((t as any).grandFinals ?? 0),
      String((t as any).winRate ?? booyahRatio),
      String(killRatio),
      String(booyahRatio),
      String((t as any).positionPoints ?? 0),
      String((t as any).totalPoints ?? 0),
      String(matches),
      String((t as any).players ?? 0),
      String(t.status || "Active"),
      String(t.description || ""),
      String((ranked as any).lastUpdated || (t as any).lastUpdated || ""),
    ];
  });

  return [header, ...rows];
}
