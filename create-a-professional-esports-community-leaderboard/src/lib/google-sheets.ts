import { sampleTeams } from "./sample-data";
import { rankTeams } from "./rankings";
import type { RawTeam, RankedTeam } from "./types";
import { readFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

export type TournamentNews = {
  id?: string;
  title: string;
  description?: string;
  date?: string;
  type?: string;
  status?: string;
  link?: string;
};

async function fetchFromLocalFile(): Promise<RawTeam[] | null> {
  try {
    const filePath = path.join(process.cwd(), "data", "teams.json");
    const contents = await readFile(filePath, "utf8");
    const teams = JSON.parse(contents) as RawTeam[];
    return Array.isArray(teams) && teams.length ? teams : null;
  } catch {
    return null;
  }
}

async function fetchSheetPayload(): Promise<any | null> {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhookUrl) return null;
  try {
    const response = await fetch(webhookUrl, { method: "GET", cache: "no-store", headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Google Apps Script returned ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Google Sheets read error:", error);
    return null;
  }
}

async function fetchFromGoogleAppsScript(): Promise<RawTeam[] | null> {
  const payload = await fetchSheetPayload();
  if (!payload) return null;
  const teams = Array.isArray(payload) ? payload : payload?.teams;
  return Array.isArray(teams) ? teams as RawTeam[] : null;
}

export async function getTournamentNews(): Promise<TournamentNews[]> {
  const payload = await fetchSheetPayload();
  if (!payload || Array.isArray(payload)) return [];
  const news = Array.isArray(payload.news) ? payload.news : [];
  return news.filter((item: TournamentNews) => String(item.status || "Published").toLowerCase() !== "hidden");
}

export async function getRankedTeams(): Promise<RankedTeam[]> {
  try {
    const teams = (await fetchFromGoogleAppsScript()) || (await fetchFromLocalFile()) || sampleTeams;
    return rankTeams(teams.length ? teams : sampleTeams);
  } catch (error) {
    console.error(error);
    return rankTeams((await fetchFromLocalFile()) || sampleTeams);
  }
}

export async function getTeamBySlug(slug: string) {
  const teams = await getRankedTeams();
  return teams.find((team) => team.slug === slug);
}

function base64url(input: string | Buffer) {
  return Buffer.from(input).toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getServiceAccountAccessToken(serviceAccountJson: string) {
  const sa = JSON.parse(serviceAccountJson);
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;
  const header = { alg: "RS256", typ: "JWT" };
  const claim = { iss: sa.client_email, scope: "https://www.googleapis.com/auth/spreadsheets", aud: "https://oauth2.googleapis.com/token", exp, iat };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const sign = crypto.createSign("RSA-SHA256");
  const key = sa.private_key.replace(/\\n/g, "\n");
  sign.update(unsigned);
  const signature = sign.sign(key);
  const jwt = `${unsigned}.${base64url(signature)}`;
  const resp = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(jwt)}` });
  if (!resp.ok) throw new Error(`Service account token request failed: ${resp.status}`);
  const payload = await resp.json();
  return payload.access_token as string;
}

export async function updateGoogleSheetValues(sheetId: string, range: string, rows: Array<string[]>, serviceAccountJson: string) {
  const token = await getServiceAccountAccessToken(serviceAccountJson);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const resp = await fetch(url, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ values: rows }) });
  if (!resp.ok) throw new Error(`Google Sheets update failed: ${resp.status} ${await resp.text()}`);
  return await resp.json();
}

export function teamsToSheetRows(teams: Array<RawTeam | RankedTeam>) {
  const header = ["Team", "Slug", "Rank", "PreviousRank", "CommunityPoints", "Badge", "Logo URL", "Banner URL", "Kills", "Booyahs", "Championships", "RunnerUp", "SecondRunnerUp", "Top3Finishes", "FinalistFinishes", "OfficialMatchFinalists", "EventsPlayed", "GrandFinals", "WinRate", "KillRatio", "Players", "Status", "Description", "LastUpdated"];
  const rows = teams.map((t) => {
    const ranked = t as RankedTeam;
    return [t.teamName || "", ranked.slug || "", String(ranked.rank ?? ""), String(ranked.previousRank ?? ""), String(ranked.communityPoints ?? ""), String(ranked.badge ?? ""), t.logoUrl || "", (t as any).bannerUrl || "", String((t as RawTeam).kills ?? 0), String((t as RawTeam).booyahs ?? 0), String((t as RawTeam).championships ?? 0), String((t as RawTeam).runnerUp ?? 0), String((t as RawTeam).secondRunnerUp ?? 0), String((ranked.top3Finishes as number) ?? (t as any).top3Finishes ?? 0), String((t as RawTeam).finalistFinishes ?? 0), String((t as RawTeam).officialMatchFinalists ?? 0), String((t as RawTeam).eventsPlayed ?? 0), String((t as RawTeam).grandFinals ?? 0), String((t as RawTeam).winRate ?? 0), String((t as RawTeam).killRatio ?? 0), String(t.players ?? 5), t.status || "Active", t.description || "", String(ranked.lastUpdated ?? "")];
  });
  return [header, ...rows];
}
