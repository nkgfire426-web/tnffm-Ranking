import { sampleTeams } from "./sample-data";
import { rankTeams, slugify } from "./rankings";
import type { RawTeam, RankedTeam } from "./types";
import { getTrackedEvents } from "./events";
import { readFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

export type TournamentNews = { id?: string; title: string; description?: string; date?: string; type?: string; status?: string; imageUrl?: string; link?: string };
const DEFAULT_LOGO_URL = "";
const SHEET_TIMEOUT_MS = 10000;
const SHEET_RETRIES = 3;
function asNumber(value: unknown, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function normalizeLogo(url: unknown) { return String(url ?? "").trim(); }
function normalizeRoster(value: unknown): { name: string; uid: string; playerLogoUrl?: string }[] {
  if (Array.isArray(value)) return value.map((player: any) => ({ name: String(player?.name ?? player?.Name ?? "").trim(), uid: String(player?.uid ?? player?.UID ?? player?.Uid ?? "").trim(), playerLogoUrl: String(player?.playerLogoUrl ?? player?.PlayerLogoURL ?? player?.playerLogo ?? player?.logoUrl ?? player?.LogoURL ?? "").trim() || undefined })).filter((player) => player.name || player.uid || player.playerLogoUrl);
  const raw = String(value ?? "").trim(); if (!raw) return [];
  try { return normalizeRoster(JSON.parse(raw)); } catch { return raw.split(/\r?\n|\s*[,;]\s*/).map((item) => item.trim()).filter(Boolean).map((name) => ({ name, uid: "" })); }
}
function normalizeTeam(input: Record<string, any>): RawTeam { const teamName = String(input.teamName ?? input.Team ?? input.team ?? "").trim(); const roster = normalizeRoster(input.roster ?? input.Roster); const matches = Math.max(0, asNumber(input.matchesPlayed ?? input.MatchesPlayed, 0)); const kills = Math.max(0, asNumber(input.kills ?? input.Kills, 0)); const booyahs = Math.max(0, asNumber(input.booyahs ?? input.Booyahs, 0)); return { ...input, teamName, slug: String(input.slug ?? input.Slug ?? slugify(teamName)).trim() || slugify(teamName), logoUrl: normalizeLogo(input.logoUrl ?? input["Logo URL"] ?? input.LogoURL), bannerUrl: String(input.bannerUrl ?? input["Banner URL"] ?? "").trim(), players: roster.length || Math.max(0, asNumber(input.players ?? input.Players, 0)), roster, status: String(input.status ?? input.Status ?? "Active"), registrationStatus: input.registrationStatus ?? input.RegistrationStatus ?? "Registered", description: String(input.description ?? input.Description ?? ""), mobileNumber: String(input.mobileNumber ?? input["Mobile Number"] ?? "").trim(), kills, booyahs, championships: Math.max(0, asNumber(input.championships ?? input.Championships, 0)), runnerUp: Math.max(0, asNumber(input.runnerUp ?? input.RunnerUp, 0)), secondRunnerUp: Math.max(0, asNumber(input.secondRunnerUp ?? input.SecondRunnerUp, 0)), top5Finishes: Math.max(0, asNumber(input.top5Finishes ?? input.Top5Finishes, 0)), finalistFinishes: Math.max(0, asNumber(input.finalistFinishes ?? input.FinalistFinishes, 0)), officialMatchFinalists: Math.max(0, asNumber(input.officialMatchFinalists ?? input.OfficialMatchFinalists, 0)), eventsPlayed: Math.max(0, asNumber(input.eventsPlayed ?? input.EventsPlayed, 0)), grandFinals: Math.max(0, asNumber(input.grandFinals ?? input.GrandFinals, 0)), matchesPlayed: matches, positionPoints: Math.max(0, asNumber(input.positionPoints ?? input.PositionPoints, 0)), totalPoints: Math.max(0, asNumber(input.totalPoints ?? input.TotalPoints, 0)), killRatio: matches > 0 ? kills / matches : 0, booyahRatio: matches > 0 ? (booyahs / matches) * 100 : 0, winRate: matches > 0 ? (booyahs / matches) * 100 : 0, lastUpdated: String(input.lastUpdated ?? input.LastUpdated ?? "") } as RawTeam; }
async function fetchFromLocalFile(): Promise<RawTeam[] | null> { try { const contents = await readFile(path.join(process.cwd(), "data", "teams.json"), "utf8"); const teams = JSON.parse(contents) as RawTeam[]; return Array.isArray(teams) ? teams.map((t) => normalizeTeam(t as any)) : null; } catch { return null; } }
async function fetchSheetPayload(): Promise<any | null> { const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL; if (!webhookUrl) { console.error("Google Sheets read error: GOOGLE_SHEETS_WEBHOOK_URL is not configured"); return null; } let lastError: unknown = null; for (let attempt = 1; attempt <= SHEET_RETRIES; attempt += 1) { const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), SHEET_TIMEOUT_MS); try { const response = await fetch(webhookUrl, { method: "GET", cache: "no-store", signal: controller.signal, headers: { Accept: "application/json", "Cache-Control": "no-cache, no-store, max-age=0", Pragma: "no-cache" } }); if (!response.ok) throw new Error(`Google Apps Script returned HTTP ${response.status}`); const payload = await response.json(); if (!payload || payload.ok === false) throw new Error(String(payload?.message || "Google Apps Script returned an unsuccessful response")); return payload; } catch (error) { lastError = error; if (attempt < SHEET_RETRIES) await new Promise((resolve) => setTimeout(resolve, 350 * attempt)); } finally { clearTimeout(timeout); } } console.error("Google Sheets read error after retries:", lastError); return null; }
async function fetchFromGoogleAppsScript(): Promise<RawTeam[] | null> { const payload = await fetchSheetPayload(); if (!payload) return null; const teams = Array.isArray(payload) ? payload : payload?.teams; if (!Array.isArray(teams)) { console.error("Google Sheets read error: response did not contain a teams array"); return null; } return teams.map((team: Record<string, any>) => normalizeTeam(team)); }
export async function getRegisteredTeams(): Promise<RawTeam[]> {
  const payload = await fetchSheetPayload();
  const teamsSource = payload && Array.isArray(payload.teams)
    ? payload.teams
    : await fetchFromLocalFile();
  const finalTeams = teamsSource !== null ? teamsSource : sampleTeams;

  const rankings: any[] = payload && Array.isArray(payload.rankings) ? payload.rankings : [];
  const rankingById = new Map<string, any>(rankings.map((r: any): [string, any] => [String(r.teamId ?? ""), r]));
  const rankingByName = new Map<string, any>(rankings.map((r: any): [string, any] => [String(r.teamName ?? "").trim().toLowerCase(), r]));

  return finalTeams
    .filter((team: any) => String(team.registrationStatus || team.status || "Registered").toLowerCase() !== "hidden")
    .map((team: any) => {
      const normalized: any = normalizeTeam(team as any);
      const ranking = rankingById.get(String((team as any).teamId ?? "")) ||
        rankingByName.get(normalized.teamName.trim().toLowerCase());

      if (ranking) {
        normalized.rank = asNumber(ranking.rank, 0);
        normalized.communityPoints = asNumber(ranking.communityScore ?? ranking.communityPoints, 0);
        normalized.eventsPlayed = asNumber(ranking.eventsPlayed, normalized.eventsPlayed);
        normalized.championships = asNumber(ranking.championships, normalized.championships);
        normalized.runnerUp = asNumber(ranking.runnerUp, normalized.runnerUp);
        normalized.secondRunnerUp = asNumber(ranking.secondRunnerUp, normalized.secondRunnerUp);
        normalized.top5Finishes = asNumber(ranking.top5Finishes, normalized.top5Finishes);
        normalized.positionPoints = asNumber(ranking.positionPoints, normalized.positionPoints);
        normalized.totalPoints = asNumber(ranking.totalPoints, normalized.totalPoints);
        normalized.rankingEligible = String(ranking.eligible ?? "Yes").toLowerCase() !== "no";
      }

      return {
        ...normalized,
        slug: (team as any).slug || normalized.slug || slugify(normalized.teamName)
      };
    })
    .sort((a: RawTeam, b: RawTeam) => a.teamName.localeCompare(b.teamName));
}
export async function getTournamentNews(): Promise<TournamentNews[]> { const payload = await fetchSheetPayload(); if (!payload || Array.isArray(payload)) return []; const news = Array.isArray(payload.news) ? payload.news : []; return news.map((item: Record<string, any>) => ({ id: String(item.id ?? item.ID ?? ""), title: String(item.title ?? item.Title ?? ""), description: String(item.description ?? item.Description ?? ""), date: String(item.date ?? item.Date ?? ""), type: String(item.type ?? item.Type ?? ""), status: String(item.status ?? item.Status ?? "Published"), imageUrl: String(item.imageUrl ?? item.ImageURL ?? ""), link: String(item.link ?? item.Link ?? "") })).filter((item: TournamentNews) => String(item.status || "Published").toLowerCase() !== "hidden"); }
export async function getRankedTeams(): Promise<RankedTeam[]> {
  try {
    const payload = await fetchSheetPayload();
    if (payload && Array.isArray(payload.rankings)) {
      const teamsRaw = Array.isArray(payload.teams) ? payload.teams : [];
      const byId = new Map(teamsRaw.map((team: any) => [String(team.teamId ?? team.id ?? ""), team]));
      const byName = new Map(teamsRaw.map((team: any) => [String(team.teamName ?? team.team ?? "").trim().toLowerCase(), team]));

      const ranked = payload.rankings
        .filter((r: any) => String(r?.status ?? "Active").toLowerCase() !== "hidden")
        .map((r: any) => {
          const base = byId.get(String(r.teamId ?? "")) || byName.get(String(r.teamName ?? "").trim().toLowerCase()) || {};
          const matches = asNumber(r.matchesPlayed ?? base.matchesPlayed, 0);
          const kills = asNumber(r.kills ?? base.kills, 0);
          const booyahs = asNumber(r.booyahs ?? base.booyahs, 0);
          return normalizeTeam({
            ...base,
            ...r,
            teamName: r.teamName ?? base.teamName,
            slug: r.slug ?? base.slug,
            logoUrl: r.logoUrl ?? base.logoUrl,
            bannerUrl: r.bannerUrl ?? base.bannerUrl,
            roster: base.roster ?? [],
            players: base.players ?? 0,
            kills,
            booyahs,
            matchesPlayed: matches,
            eventsPlayed: asNumber(r.eventsPlayed ?? base.eventsPlayed, 0),
            championships: asNumber(r.championships, 0),
            runnerUp: asNumber(r.runnerUp, 0),
            secondRunnerUp: asNumber(r.secondRunnerUp, 0),
            top5Finishes: asNumber(r.top5Finishes, 0),
            communityPoints: asNumber(r.communityScore ?? r.communityPoints, 0),
            rank: asNumber(r.rank, 0),
            previousRank: asNumber(r.previousRank, 0),
            badge: String(r.badge ?? ""),
            rankingEligible: String(r.eligible ?? "Yes").toLowerCase() !== "no"
          });
        })
        .filter((team: any) => team.teamName);

      return ranked.sort((a: any, b: any) => Number(a.rank || 999999) - Number(b.rank || 999999)) as RankedTeam[];
    }

    const teams = await fetchFromGoogleAppsScript();
    const source = teams !== null ? teams : await fetchFromLocalFile();
    const finalTeams = source !== null ? source : sampleTeams;
    const events = await getTrackedEvents();
    return rankTeams(finalTeams, events);
  } catch (error) {
    console.error("Ranking data error:", error);
    return rankTeams((await fetchFromLocalFile()) || sampleTeams);
  }
}
export async function getTeamBySlug(slug: string) { const teams = await getRegisteredTeams(); return teams.find((team) => slugify(team.teamName) === slug || (team as any).slug === slug); }
function base64url(input: string | Buffer) { return Buffer.from(input).toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_"); }
async function getServiceAccountAccessToken(serviceAccountJson: string) { const sa = JSON.parse(serviceAccountJson); const iat = Math.floor(Date.now() / 1000); const exp = iat + 3600; const header = { alg: "RS256", typ: "JWT" }; const claim = { iss: sa.client_email, scope: "https://www.googleapis.com/auth/spreadsheets", aud: "https://oauth2.googleapis.com/token", exp, iat }; const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`; const sign = crypto.createSign("RSA-SHA256"); const key = sa.private_key.replace(/\\n/g, "\n"); sign.update(unsigned); const signature = sign.sign(key); const jwt = `${unsigned}.${base64url(signature)}`; const resp = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(jwt)}` }); if (!resp.ok) throw new Error(`Service account token request failed: ${resp.status}`); const payload = await resp.json(); return payload.access_token as string; }
export async function updateGoogleSheetValues(sheetId: string, range: string, rows: Array<string[]>, serviceAccountJson: string) { const token = await getServiceAccountAccessToken(serviceAccountJson); const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`; const resp = await fetch(url, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ values: rows }) }); if (!resp.ok) throw new Error(`Google Sheets update failed: ${resp.status} ${await resp.text()}`); return await resp.json(); }
export function teamsToSheetRows(teams: Array<RawTeam | RankedTeam>) { const header = ["Team","Slug","Rank","PreviousRank","CommunityPoints","Badge","Logo URL","Banner URL","Kills","Booyahs","Championships","RunnerUp","SecondRunnerUp","Top5Finishes","FinalistFinishes","OfficialMatchFinalists","EventsPlayed","GrandFinals","WinRate","KillRatio","BooyahRatio","PositionPoints","TotalPoints","MatchesPlayed","Players","Status","Description","LastUpdated"]; const rows = teams.map((t) => { const ranked = t as RankedTeam; const matches = Math.max(0, asNumber((t as any).matchesPlayed, 0)); const kills = Math.max(0, asNumber((t as any).kills, 0)); const booyahs = Math.max(0, asNumber((t as any).booyahs, 0)); const killRatio = matches > 0 ? kills / matches : 0; const booyahRatio = matches > 0 ? (booyahs / matches) * 100 : 0; return [t.teamName || "", ranked.slug || slugify(t.teamName || "team"), String(ranked.rank ?? ""), String(ranked.previousRank ?? ""), String(ranked.communityPoints ?? ""), String(ranked.badge ?? ""), normalizeLogo(t.logoUrl), String((t as any).bannerUrl || ""), String(kills), String(booyahs), String((t as any).championships ?? 0), String((t as any).runnerUp ?? 0), String((t as any).secondRunnerUp ?? 0), String((t as any).top5Finishes ?? 0), String((t as any).finalistFinishes ?? 0), String((t as any).officialMatchFinalists ?? 0), String((t as any).eventsPlayed ?? 0), String((t as any).grandFinals ?? 0), String((t as any).winRate ?? booyahRatio), String(killRatio), String(booyahRatio), String((t as any).positionPoints ?? 0), String((t as any).totalPoints ?? 0), String(matches), String((t as any).players ?? 0), String(t.status || "Active"), String(t.description || ""), String((ranked as any).lastUpdated || (t as any).lastUpdated || "")]; }); return [header, ...rows]; }