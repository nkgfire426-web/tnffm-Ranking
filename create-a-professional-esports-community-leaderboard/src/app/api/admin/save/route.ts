import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

const MAX_IMAGE_DATA_URL_LENGTH = 4_000_000;

const num = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

function communityPoints(team: Record<string, unknown>) {
  return (
    num(team.championships) * 100 +
    num(team.runnerUp) * 70 +
    num(team.secondRunnerUp) * 50 +
    num(team.top5Finishes) * 25 +
    num(team.finalistFinishes || team.grandFinals) * 15 +
    num(team.officialMatchFinalists) * 100 +
    num(team.approvedSubmissionPoints)
  );
}

function eventsPlayed(team: Record<string, unknown>) {
  return (
    num(team.championships) +
    num(team.runnerUp) +
    num(team.secondRunnerUp) +
    num(team.top5Finishes) +
    num(team.finalistFinishes || team.grandFinals) +
    num(team.officialMatchFinalists)
  );
}

function normalizeTeamsForSheet(input: unknown[]) {
  const teams = input.map((value) => {
    const team = { ...(value as Record<string, unknown>) };
    const points = communityPoints(team);
    team.communityPoints = points;
    const suppliedEventsPlayed = num(team.eventsPlayed); team.eventsPlayed = suppliedEventsPlayed > 0 ? suppliedEventsPlayed : eventsPlayed(team);
    team.top3Finishes = num(team.championships) + num(team.runnerUp) + num(team.secondRunnerUp);
    team.officialMatchFinalists = Math.max(0, num(team.officialMatchFinalists));
    return team;
  });

  teams.sort((a, b) => {
    const pointsDiff = num(b.communityPoints) - num(a.communityPoints);
    if (pointsDiff) return pointsDiff;
    const championshipDiff = num(b.championships) - num(a.championships);
    if (championshipDiff) return championshipDiff;
    const runnerUpDiff = num(b.runnerUp) - num(a.runnerUp);
    if (runnerUpDiff) return runnerUpDiff;
    return eventsPlayed(a) - eventsPlayed(b);
  });

  return teams.map((team, index) => ({
    ...team,
    rank: index + 1,
    lastUpdated: new Date().toISOString()
  }));
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

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      password?: string;
      teams?: unknown[];
      events?: unknown[];
      collaborators?: unknown[];
      news?: unknown[];
    };
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected || payload.password !== expected) return NextResponse.json({ ok: false, message: "Invalid password." }, { status: 401 });

    const hasTeams = Array.isArray(payload.teams);
    const hasEvents = Array.isArray(payload.events);
    const hasCollaborators = Array.isArray(payload.collaborators);
    const hasNews = Array.isArray(payload.news);
    const teams = hasTeams ? payload.teams! : [];
    const events = hasEvents ? payload.events! : [];
    const collaborators = hasCollaborators ? payload.collaborators! : [];
    const news = hasNews ? payload.news! : [];

    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    if (!webhookUrl) return NextResponse.json({ ok: false, message: "Google Sheets is not configured. Add GOOGLE_SHEETS_WEBHOOK_URL in Vercel." }, { status: 503 });

    const { normalizedTeams: logoTeams, normalizedCollaborators } = await persistLogos(webhookUrl, teams, collaborators);
    const normalizedTeams = normalizeTeamsForSheet(logoTeams);
    const data: Record<string, unknown> = {};
    if (hasTeams) data.teams = normalizedTeams;
    if (hasEvents) data.events = events;
    if (hasCollaborators) data.collaborators = normalizedCollaborators;
    if (hasNews) data.news = news;

    const response = await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify(data) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok === false) return NextResponse.json({ ok: false, message: result.message || "Google Sheet update failed." }, { status: 502 });

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/news");
    revalidatePath("/collaborators");
    return NextResponse.json({ ok: true, googleSheets: true, logosPersisted: true, rankingsCalculated: true });
  } catch (error) {
    console.error("Google Sheets save error:", error);
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to update Google Sheet." }, { status: 500 });
  }
}
