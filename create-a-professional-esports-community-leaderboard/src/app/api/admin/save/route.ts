import { rankTeams } from "@/lib/rankings";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const bool = (v: unknown) => v === true || String(v ?? "").trim().toLowerCase() === "true";
const text = (v: unknown) => String(v ?? "").trim();

function points(t: any) {
  return num(t.championships) * 100
    + num(t.runnerUp) * 70
    + num(t.secondRunnerUp) * 50
    + num(t.top5Finishes) * 25
    + num(t.finalistFinishes || t.grandFinals) * 15
    + num(t.officialMatchFinalists) * 100
    + num(t.approvedSubmissionPoints);
}

function normalizeTeams(items: unknown[]) {
  return items.map((x: any) => {
    const t = { ...x };
    t.communityPoints = points(t);
    return t;
  });
}

function cleanResult(r: any, e: any) {
  const kills = Math.max(0, num(r?.kills));
  const booyahs = Math.max(0, num(r?.booyahs));
  const pp = Math.max(0, num(r?.positionPoints));
  const rank = Math.max(1, num(r?.rank ?? r?.position) || 1);
  const matches = Math.max(0, num(e?.matchesPlayed));
  return {
    resultId: text(r?.resultId ?? r?.id), teamId: text(r?.teamId), teamName: text(r?.teamName ?? r?.team),
    position: rank, rank, kills, booyahs, positionPoints: pp, killPoints: kills,
    totalPoints: pp + kills, total: pp + kills,
    killRatio: matches ? kills / matches : 0, booyahRatio: matches ? (booyahs / matches) * 100 : 0,
    proofUrl: text(r?.proofUrl ?? r?.proofURL), verified: bool(r?.verified)
  };
}

function cleanEvents(items: unknown[]) {
  return items.map((e: any) => ({ ...e, matchesPlayed: Math.max(0, num(e?.matchesPlayed)), published: bool(e?.published),
    results: (Array.isArray(e?.results) ? e.results : []).filter((r: any) => text(r?.teamName ?? r?.team)).map((r: any) => cleanResult(r, e))
  }));
}

function rankingResults(events: any[]) {
  const rows: any[] = [];
  events.forEach((e, i) => (e.results || []).forEach((r: any, j: number) => rows.push({
    resultId: text(r.resultId) || `RES-${i + 1}-${j + 1}`, eventId: text(e.eventId ?? e.id) || `EVENT-${i + 1}`,
    eventName: text(e.name ?? e.eventName), eventDate: text(e.date ?? e.eventDate), published: bool(e.published),
    teamId: text(r.teamId), teamName: text(r.teamName), position: num(r.rank ?? r.position), rank: num(r.rank ?? r.position),
    positionPoints: num(r.positionPoints), kills: num(r.kills), booyahs: num(r.booyahs), killPoints: num(r.killPoints),
    totalPoints: num(r.total ?? r.totalPoints), total: num(r.total ?? r.totalPoints), killRatio: num(r.killRatio),
    booyahRatio: num(r.booyahRatio), proofUrl: text(r.proofUrl ?? r.proofURL), verified: bool(r.verified), resultOrder: j + 1
  })));
  return rows;
}

function validatePublishedEvents(events: any[], teams: any[]) {
  const registered = new Set(teams.map((t: any) => text(t.teamName).toLowerCase()).filter(Boolean));
  for (const event of events) {
    if (!bool(event.published)) continue;
    const name = text(event.name) || "Event";
    const results = Array.isArray(event.results) ? event.results : [];
    if (!results.length) throw new Error(`${name}: cannot publish without results.`);
    if (num(event.matchesPlayed) <= 0) throw new Error(`${name}: Matches Played must be greater than 0.`);
    const prize = Number(String(event.prize ?? "").replace(/[^0-9.]/g, "")) || 0;
    const official = text(event.status).toLowerCase() === "official" || text(event.prize).toLowerCase().includes("official");
    if (!official && prize <= 1000) throw new Error(`${name}: prize pool must be above Rs.1000 before publishing.`);
    const expectedTeams = num(event.teams);
    if (expectedTeams > 0 && results.length !== expectedTeams) throw new Error(`${name}: expected ${expectedTeams} results, but ${results.length} were entered.`);
    const names = results.map((r: any) => text(r.teamName).toLowerCase()).filter(Boolean);
    if (names.length !== results.length) throw new Error(`${name}: every result must have a team name.`);
    if (new Set(names).size !== names.length) throw new Error(`${name}: duplicate teams are not allowed.`);
    const ranks = results.map((r: any) => num(r.rank));
    if (ranks.some((r: number) => r < 1 || r > 18)) throw new Error(`${name}: ranks must be between 1 and 18.`);
    if (new Set(ranks).size !== ranks.length) throw new Error(`${name}: duplicate ranks are not allowed.`);
    [...ranks].sort((a: number, b: number) => a - b).forEach((rank: number, index: number) => { if (rank !== index + 1) throw new Error(`${name}: ranks must be continuous starting at 1. Missing rank ${index + 1}.`); });
    const unregistered = names.filter((team: string) => !registered.has(team));
    if (unregistered.length) throw new Error(`${name}: ${unregistered.join(", ")} is not registered in the Teams sheet.`);
  }
}

async function readSheet(url: string) {
  let last: any = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const readUrl = new URL(url);
      readUrl.searchParams.set("_tnffm_verify", `${Date.now()}-${attempt}-${Math.random().toString(36).slice(2)}`);
      const r = await fetch(readUrl.toString(), { method: "GET", cache: "no-store", headers: { Accept: "application/json", "Cache-Control": "no-cache, no-store, max-age=0", Pragma: "no-cache" } });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j || j.ok === false) throw new Error(String(j?.message || `Google Sheets read failed (${r.status}).`));
      return j;
    } catch (error) {
      last = error;
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw last || new Error("Google Sheets read failed.");
}

function verifyList(expected: unknown[], actual: unknown[], name: string, key: (x: any) => string) {
  const expectedList = Array.isArray(expected) ? expected : [];
  const actualList = Array.isArray(actual) ? actual : [];
  if (expectedList.length !== actualList.length) throw new Error(`${name} was written but Google Sheets returned a different record count. Expected ${expectedList.length}, received ${actualList.length}.`);
  const expectedKeys = expectedList.map(key);
  const actualKeys = actualList.map(key);
  const actualSet = new Set(actualKeys);
  const missing = expectedKeys.filter(k => !actualSet.has(k));
  if (missing.length) throw new Error(`${name} was written but read-back does not match. Missing record: ${missing[0]}`);
}

function rankingIdentity(x: any) {
  const teamId = text(x?.teamId ?? x?.["Team ID"]);
  const teamName = text(x?.teamName ?? x?.["Team Name"] ?? x?.Team).toLowerCase();
  const rank = num(x?.rank ?? x?.Rank);
  return `${teamId || teamName}|${rank}`;
}

function rankingSnapshot(x: any) {
  return JSON.stringify({
    identity: rankingIdentity(x),
    communityPoints: num(x?.communityPoints ?? x?.["Community Points"] ?? x?.communityScore ?? x?.["Community Score"]),
    championships: num(x?.championships ?? x?.Championships), runnerUp: num(x?.runnerUp ?? x?.["Runner-Up"]),
    secondRunnerUp: num(x?.secondRunnerUp ?? x?.["2nd Runner-Up"]), top5Finishes: num(x?.top5Finishes ?? x?.["Top 5 Finishes"]),
    finalistFinishes: num(x?.finalistFinishes ?? x?.FinalistFinishes)
  });
}

export async function POST(request: NextRequest) {
  try {
    const p = await request.json() as any;
    if (!process.env.ADMIN_PASSWORD || p.password !== process.env.ADMIN_PASSWORD) return NextResponse.json({ ok: false, message: "Invalid password." }, { status: 401 });
    const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    if (!url) return NextResponse.json({ ok: false, message: "Google Sheets is not configured. Add GOOGLE_SHEETS_WEBHOOK_URL in Vercel." }, { status: 503 });

    const hasTeams = Array.isArray(p.teams), hasEvents = Array.isArray(p.events), hasRankings = Array.isArray(p.rankings), hasCollabs = Array.isArray(p.collaborators), hasNews = Array.isArray(p.news);
    const data: any = {};
    if (hasTeams) data.teams = normalizeTeams(p.teams);
    if (hasEvents) {
      data.events = cleanEvents(p.events);
      validatePublishedEvents(data.events, data.teams || []);
      data.rankingResults = rankingResults(data.events);
      data.results = data.rankingResults;
      const publishedEvents = data.events.filter((e: any) => bool(e.published));
      if (hasTeams && publishedEvents.length) {
        data.rankings = rankTeams(data.teams as any, publishedEvents as any).map((t: any) => ({
          ...t, teamId: t.teamId || data.teams.find((x: any) => text(x.teamName).toLowerCase() === text(t.teamName).toLowerCase())?.teamId || ""
        }));
      } else if (hasTeams) data.rankings = [];
    }
    if (hasRankings && !hasEvents) data.rankings = p.rankings;
    if (hasCollabs) data.collaborators = p.collaborators;
    if (hasNews) data.news = p.news;
    if (!Object.keys(data).length) throw new Error("No supported data section was supplied.");

    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify(data) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok === false) throw new Error(String(result.message || "Google Sheet update failed."));

    let saved: any = result?.data || result || {};
    let savedResults = hasEvents ? (Array.isArray(saved.rankingResults) ? saved.rankingResults : Array.isArray(saved.results) ? saved.results : []) : [];
    if (hasEvents && savedResults.length !== data.rankingResults.length) {
      saved = await readSheet(url);
      savedResults = Array.isArray(saved.rankingResults) ? saved.rankingResults : Array.isArray(saved.results) ? saved.results : [];
    }

    if (hasTeams) verifyList(data.teams, saved.teams || [], "Teams", (x: any) => `${text(x.teamId ?? x["Team ID"])}|${text(x.teamName ?? x["Team Name"] ?? x.Team).toLowerCase()}`);
    if (hasEvents) verifyList(data.rankingResults, savedResults, "Event Results", (x: any) => JSON.stringify([text(x.eventId ?? x["Event ID"]), text(x.teamName ?? x["Team Name"]).toLowerCase(), num(x.position ?? x.Position ?? x.rank), num(x.totalPoints ?? x["Total Points"] ?? x.total ?? x.Total), bool(x.published ?? x.Published)]));
    if (data.rankings) {
      verifyList(data.rankings, saved.rankings || [], "Community Rankings", rankingIdentity);
      const savedByIdentity = new Map((saved.rankings || []).map((x: any) => [rankingIdentity(x), rankingSnapshot(x)]));
      for (const expected of data.rankings) {
        const id = rankingIdentity(expected);
        const actual = savedByIdentity.get(id);
        if (!actual || actual !== rankingSnapshot(expected)) throw new Error(`Community Rankings was written but read-back statistics do not match for ${text(expected.teamName)}.`);
      }
    }
    if (hasCollabs) verifyList(data.collaborators, saved.collaborators || [], "Collaborators", (x: any) => JSON.stringify(x));
    if (hasNews) verifyList(data.news, saved.news || [], "News", (x: any) => JSON.stringify(x));

    revalidateTag("tnffm-sheet");
    ["/", "/ranking", "/teams", "/tracked-events", "/admin", "/collaborators"].forEach(path => revalidatePath(path));
    const publishedEvents = hasEvents ? data.events.filter((e: any) => bool(e.published)) : [];
    const publishedResults = hasEvents ? data.rankingResults.filter((r: any) => bool(r.published)) : [];
    const publishedRanking = Array.isArray(data.rankings) ? data.rankings : [];
    return NextResponse.json({ ok: true, published: hasEvents, googleSheets: true, verified: true, rankingDetailsSaved: hasEvents, rankingsCalculated: Boolean(data.rankings), eventResultsCount: savedResults.length, publishedEventCount: publishedEvents.length, publishedResultCount: publishedResults.length, rankingTeamCount: publishedRanking.length, publishedAt: hasEvents ? new Date().toISOString() : null, message: hasEvents ? `Published successfully. ${publishedResults.length} result${publishedResults.length === 1 ? "" : "s"} verified, ${publishedRanking.length} community ranking team${publishedRanking.length === 1 ? "" : "s"} rebuilt, and public pages revalidated.` : "Changes saved and verified successfully." });
  } catch (error) {
    console.error("Google Sheets publish error:", error);
    return NextResponse.json({ ok: false, published: false, verified: false, message: error instanceof Error ? error.message : "Unable to publish and verify ranking." }, { status: 502 });
  }
}
