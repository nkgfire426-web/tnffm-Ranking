import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

const MAX_IMAGE_DATA_URL_LENGTH = 4_000_000;
const num = (value: unknown) => { const n = Number(value); return Number.isFinite(n) ? n : 0; };

function communityPoints(team: Record<string, unknown>) {
  return num(team.championships) * 100 + num(team.runnerUp) * 70 + num(team.secondRunnerUp) * 50 + num(team.top5Finishes) * 25 + num(team.finalistFinishes || team.grandFinals) * 15 + num(team.officialMatchFinalists) * 100 + num(team.approvedSubmissionPoints);
}
function eventsPlayed(team: Record<string, unknown>) {
  return num(team.championships) + num(team.runnerUp) + num(team.secondRunnerUp) + num(team.top5Finishes) + num(team.finalistFinishes || team.grandFinals) + num(team.officialMatchFinalists);
}
function normalizeTeamsForSheet(input: unknown[]) {
  const teams = input.map((value) => {
    const team = { ...(value as Record<string, unknown>) };
    team.communityPoints = communityPoints(team);
    const suppliedEventsPlayed = num(team.eventsPlayed);
    team.eventsPlayed = suppliedEventsPlayed > 0 ? suppliedEventsPlayed : eventsPlayed(team);
    team.top3Finishes = num(team.championships) + num(team.runnerUp) + num(team.secondRunnerUp);
    team.officialMatchFinalists = Math.max(0, num(team.officialMatchFinalists));
    return team;
  });
  teams.sort((a, b) => {
    const p = num(b.communityPoints) - num(a.communityPoints); if (p) return p;
    const c = num(b.championships) - num(a.championships); if (c) return c;
    const r = num(b.runnerUp) - num(a.runnerUp); if (r) return r;
    return eventsPlayed(a) - eventsPlayed(b);
  });
  return teams.map((team, index) => ({ ...team, rank: index + 1, lastUpdated: new Date().toISOString() }));
}
async function persistLogo(webhookUrl: string, dataUrl: string, fileName: string): Promise<string> {
  if (!dataUrl.startsWith("data:image/")) return dataUrl;
  if (dataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) throw new Error("Logo is too large. Please upload an image smaller than about 3 MB.");
  const response = await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ action: "uploadLogo", dataUrl, fileName }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok === false || !result.url) throw new Error(result.message || "Google Drive logo upload failed.");
  return String(result.url);
}
async function persistLogos(webhookUrl: string, teams: unknown[], collaborators: unknown[]) {
  const normalizedTeams = await Promise.all(teams.map(async (team, index) => {
    const item = { ...(team as Record<string, unknown>) };
    if (typeof item.logoUrl === "string" && item.logoUrl.startsWith("data:image/")) item.logoUrl = await persistLogo(webhookUrl, item.logoUrl, `team-logo-${index + 1}`);
    if (typeof item.bannerUrl === "string" && item.bannerUrl.startsWith("data:image/")) item.bannerUrl = await persistLogo(webhookUrl, item.bannerUrl, `team-banner-${index + 1}`);
    return item;
  }));
  const normalizedCollaborators = await Promise.all(collaborators.map(async (collaborator, index) => {
    const item = { ...(collaborator as Record<string, unknown>) };
    if (typeof item.logoUrl === "string" && item.logoUrl.startsWith("data:image/")) item.logoUrl = await persistLogo(webhookUrl, item.logoUrl, `collaborator-logo-${index + 1}`);
    return item;
  }));
  return { normalizedTeams, normalizedCollaborators };
}

function cleanRoster(value: unknown): Array<{name: string; uid: string; role: string; playerLogoUrl: string}> {
  let roster: unknown = value;
  if (typeof roster === "string") { try { roster = JSON.parse(roster); } catch { roster = []; } }
  if (!Array.isArray(roster)) return [];
  return roster
    .map((p) => ({
      name: String((p as any)?.name ?? "").trim(),
      uid: String((p as any)?.uid ?? "").trim(),
      role: String((p as any)?.role ?? "").trim(),
      playerLogoUrl: String((p as any)?.playerLogoUrl ?? (p as any)?.playerLogo ?? "").trim()
    }))
    .filter((p) => p.name || p.uid || p.role || p.playerLogoUrl);
}
function comparableTeam(team: unknown) {
  const t = { ...(team as Record<string, unknown>) };
  return JSON.stringify({
    teamName: String(t.teamName ?? t.Team ?? "").trim(),
    slug: String(t.slug ?? t.Slug ?? "").trim(),
    logoUrl: String(t.logoUrl ?? t["Logo URL"] ?? "").trim(),
    bannerUrl: String(t.bannerUrl ?? t["Banner URL"] ?? "").trim(),
    players: num(t.players ?? t.Players),
    roster: cleanRoster(t.roster ?? t.Roster),
    status: String(t.status ?? t.Status ?? "Active").trim() || "Active",
    description: String(t.description ?? t.Description ?? "").trim(),
    mobileNumber: String(t.mobileNumber ?? t["Mobile Number"] ?? "").trim()
  });
}
function comparableList(items: unknown[]) { return items.map(comparableTeam).sort(); }
async function readBackGoogleSheets(webhookUrl: string) {
  const response = await fetch(webhookUrl, { method: "GET", cache: "no-store", headers: { Accept: "application/json", "Cache-Control": "no-cache, no-store, max-age=0" } });
  if (!response.ok) throw new Error(`Google Sheets verification read failed: ${response.status}`);
  const result = await response.json().catch(() => null);
  if (!result || result.ok === false) throw new Error(String(result?.message || "Google Sheets verification returned an invalid response."));
  return result;
}
function verifySavedTeams(expected: unknown[] | undefined, actual: unknown) {
  if (!Array.isArray(expected)) return;
  const actualItems = Array.isArray(actual) ? actual : [];
  const expectedComparable = comparableList(expected);
  const actualComparable = comparableList(actualItems);
  if (expectedComparable.length !== actualComparable.length) throw new Error(`Teams were written but Google Sheets returned ${actualComparable.length} teams instead of ${expectedComparable.length}. Please retry the save.`);
  const actualSet = new Set(actualComparable);
  for (const item of expectedComparable) if (!actualSet.has(item)) throw new Error("Teams were written but the Google Sheets read-back does not match. Please retry the save.");
}
function comparableGeneric(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify(value.map(comparableGeneric).sort());
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    const r: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(o)) if (key !== "lastUpdated" && key !== "LastUpdated") r[key] = JSON.parse(comparableGeneric(item));
    return JSON.stringify(r);
  }
  return JSON.stringify(value ?? "");
}
function verifyGenericSection(expected: unknown[] | undefined, actual: unknown, section: string) {
  if (!Array.isArray(expected)) return;
  const actualItems = Array.isArray(actual) ? actual : [];
  if (expected.length !== actualItems.length) throw new Error(`${section} was not verified after saving. Expected ${expected.length} records but Google Sheets returned ${actualItems.length}.`);
  const expectedSet = new Set(expected.map(comparableGeneric));
  const actualSet = new Set(actualItems.map(comparableGeneric));
  for (const item of expectedSet) if (!actualSet.has(item)) throw new Error(`${section} was written but the Google Sheets read-back does not match. Please retry the save.`);
}
async function verifyGoogleSheetsSave(webhookUrl: string, data: Record<string, unknown>, hasTeams: boolean, hasEvents: boolean, hasCollaborators: boolean, hasNews: boolean) {
  const saved = await readBackGoogleSheets(webhookUrl);
  if (hasTeams) verifySavedTeams(data.teams as unknown[], saved?.teams);
  // Events/collaborators/news are verified against the fields returned by the API.
  // Their generated timestamps and ordering are ignored by comparableGeneric.
  if (hasEvents) verifyGenericSection(data.events as unknown[], saved?.events, "Events");
  if (hasCollaborators) verifyGenericSection(data.collaborators as unknown[], saved?.collaborators, "Collaborators");
  if (hasNews) verifyGenericSection(data.news as unknown[], saved?.news, "News");
  return saved;
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as { password?: string; teams?: unknown[]; events?: unknown[]; collaborators?: unknown[]; news?: unknown[] };
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected || payload.password !== expected) return NextResponse.json({ ok: false, message: "Invalid password." }, { status: 401 });
    const hasTeams = Array.isArray(payload.teams), hasEvents = Array.isArray(payload.events), hasCollaborators = Array.isArray(payload.collaborators), hasNews = Array.isArray(payload.news);
    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    if (!webhookUrl) return NextResponse.json({ ok: false, message: "Google Sheets is not configured. Add GOOGLE_SHEETS_WEBHOOK_URL in Vercel." }, { status: 503 });
    const { normalizedTeams: logoTeams, normalizedCollaborators } = await persistLogos(webhookUrl, hasTeams ? payload.teams! : [], hasCollaborators ? payload.collaborators! : []);
    const normalizedTeams = normalizeTeamsForSheet(logoTeams);
    const data: Record<string, unknown> = {};
    if (hasTeams) data.teams = normalizedTeams;
    if (hasEvents) data.events = payload.events!;
    if (hasCollaborators) data.collaborators = normalizedCollaborators;
    if (hasNews) data.news = payload.news!;
    const response = await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify(data) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok === false) return NextResponse.json({ ok: false, message: result.message || "Google Sheet update failed." }, { status: 502 });
    await verifyGoogleSheetsSave(webhookUrl, data, hasTeams, hasEvents, hasCollaborators, hasNews);
    revalidatePath("/"); revalidatePath("/admin"); revalidatePath("/admin/news"); revalidatePath("/collaborators");
    return NextResponse.json({ ok: true, googleSheets: true, verified: true, logosPersisted: true, rankingsCalculated: true, message: "Saved to Google Sheets and verified successfully." });
  } catch (error) {
    console.error("Google Sheets save/verification error:", error);
    return NextResponse.json({ ok: false, verified: false, message: error instanceof Error ? error.message : "Unable to update and verify Google Sheet." }, { status: 502 });
  }
}
