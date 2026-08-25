import { rankTeams } from "@/lib/rankings";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const bool = (v: unknown) => v === true || String(v ?? "").trim().toLowerCase() === "true";

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
  return items.map(x => {
    const t = { ...(x as any) };
    t.communityPoints = points(t);
    t.eventsPlayed = num(t.eventsPlayed) || num(t.championships) + num(t.runnerUp) + num(t.secondRunnerUp) + num(t.top5Finishes) + num(t.finalistFinishes || t.grandFinals) + num(t.officialMatchFinalists);
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
    resultId: String(r?.resultId ?? r?.id ?? ""),
    teamId: String(r?.teamId ?? ""),
    teamName: String(r?.teamName ?? r?.team ?? "").trim(),
    position: rank,
    rank,
    kills,
    booyahs,
    positionPoints: pp,
    killPoints: kills,
    totalPoints: pp + kills,
    total: pp + kills,
    killRatio: matches ? kills / matches : 0,
    booyahRatio: matches ? (booyahs / matches) * 100 : 0,
    proofUrl: String(r?.proofUrl ?? r?.proofURL ?? "").trim(),
    verified: bool(r?.verified)
  };
}

function cleanEvents(items: unknown[]) {
  return items.map((e: any) => ({
    ...e,
    matchesPlayed: Math.max(0, num(e?.matchesPlayed)),
    published: bool(e?.published),
    results: (Array.isArray(e?.results) ? e.results : [])
      .filter((r: any) => String(r?.teamName ?? r?.team ?? "").trim())
      .map((r: any) => cleanResult(r, e))
  }));
}

function rankingResults(events: any[]) {
  const rows: any[] = [];
  events.forEach((e, i) => (e.results || []).forEach((r: any, j: number) => rows.push({
    resultId: String(r.resultId || `RES-${i + 1}-${j + 1}`),
    eventId: String(e.eventId ?? e.id ?? `EVENT-${i + 1}`),
    eventName: String(e.name ?? e.eventName ?? ""),
    eventDate: String(e.date ?? e.eventDate ?? ""),
    published: bool(e.published),
    teamId: String(r.teamId ?? ""),
    teamName: String(r.teamName ?? ""),
    position: num(r.rank ?? r.position),
    rank: num(r.rank ?? r.position),
    positionPoints: num(r.positionPoints),
    kills: num(r.kills),
    booyahs: num(r.booyahs),
    killPoints: num(r.killPoints),
    totalPoints: num(r.total ?? r.totalPoints),
    total: num(r.total ?? r.totalPoints),
    killRatio: num(r.killRatio),
    booyahRatio: num(r.booyahRatio),
    proofUrl: String(r.proofUrl ?? r.proofURL ?? ""),
    verified: bool(r.verified),
    resultOrder: j + 1
  })));
  return rows;
}

function validatePublishedEvents(events: any[]) {
  for (const event of events) {
    if (!bool(event.published)) continue;
    const results = Array.isArray(event.results) ? event.results : [];
    if (!results.length) throw new Error(`${event.name || "Event"}: cannot publish without results.`);
    if (num(event.matchesPlayed) <= 0) throw new Error(`${event.name || "Event"}: Matches Played must be greater than 0.`);
    const prize = Number(String(event.prize ?? "").replace(/[^0-9.]/g, "")) || 0;
    const official = String(event.status ?? "").toLowerCase() === "official" || String(event.prize ?? "").toLowerCase().includes("official");
    if (!official && prize <= 1000) throw new Error(`${event.name || "Event"}: prize pool must be above Rs.1000 before publishing.`);
    const names = results.map((r: any) => String(r.teamName || "").trim().toLowerCase()).filter(Boolean);
    if (new Set(names).size !== names.length) throw new Error(`${event.name || "Event"}: duplicate teams are not allowed.`);
    const ranks = results.map((r: any) => num(r.rank)).filter(Boolean);
    if (ranks.some((r: number) => r < 1 || r > 18)) throw new Error(`${event.name || "Event"}: ranks must be between 1 and 18.`);
    if (new Set(ranks).size !== ranks.length) throw new Error(`${event.name || "Event"}: duplicate ranks are not allowed.`);
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
  const actualList = Array.isArray(actual) ? actual : [];
  if (expected.length !== actualList.length) throw new Error(`${name} was written but Google Sheets returned a different record count. Expected ${expected.length}, received ${actualList.length}.`);
  const set = new Set(actualList.map(key));
  for (const x of expected) if (!set.has(key(x))) throw new Error(`${name} was written but read-back does not match.`);
}

function getResultsFromPayload(payload: any) {
  return Array.isArray(payload?.rankingResults) ? payload.rankingResults : Array.isArray(payload?.results) ? payload.results : [];
}

export async function POST(request: NextRequest) {
  try {
    const p = await request.json() as any;
    if (!process.env.ADMIN_PASSWORD || p.password !== process.env.ADMIN_PASSWORD) return NextResponse.json({ ok: false, message: "Invalid password." }, { status: 401 });
    const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    if (!url) return NextResponse.json({ ok: false, message: "Google Sheets is not configured. Add GOOGLE_SHEETS_WEBHOOK_URL in Vercel." }, { status: 503 });

    const hasTeams = Array.isArray(p.teams);
    const hasEvents = Array.isArray(p.events);
    const hasRankings = Array.isArray(p.rankings);
    const hasCollabs = Array.isArray(p.collaborators);
    const hasNews = Array.isArray(p.news);
    const data: any = {};

    if (hasTeams) data.teams = normalizeTeams(p.teams);

    if (hasEvents) {
      data.events = cleanEvents(p.events);
      validatePublishedEvents(data.events);
      data.rankingResults = rankingResults(data.events);
      data.results = data.rankingResults;

      // The ranking is ALWAYS rebuilt from the published event results.
      // Community Rankings is therefore an output, not a competing source of truth.
      if (hasTeams) {
        data.rankings = rankTeams(data.teams as any, data.events as any).map((t: any) => ({
          ...t,
          teamId: t.teamId || data.teams.find((x: any) => String(x.teamName).trim().toLowerCase() === String(t.teamName).trim().toLowerCase())?.teamId || ""
        }));
      }
    }

    if (hasRankings && !hasEvents) data.rankings = p.rankings;
    if (hasCollabs) data.collaborators = p.collaborators;
    if (hasNews) data.news = p.news;

    if (!Object.keys(data).length) throw new Error("No supported data section was supplied.");

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(data)
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok === false) throw new Error(String(result.message || "Google Sheet update failed."));

    let saved: any = result?.data || result || {};
    let savedResults = hasEvents ? getResultsFromPayload(saved) : [];
    if (hasEvents && savedResults.length !== data.rankingResults.length) {
      saved = await readSheet(url);
      savedResults = getResultsFromPayload(saved);
    }

    if (hasTeams) verifyList(data.teams, saved.teams || [], "Teams", (x: any) => JSON.stringify([String(x.teamName ?? x.Team ?? "").trim(), String(x.teamId ?? x["Team ID"] ?? "").trim(), String(x.logoUrl ?? x["Logo URL"] ?? "").trim(), String(x.slug ?? x.Slug ?? "").trim()]));
    if (hasEvents) verifyList(data.rankingResults, savedResults, "Event Results", (x: any) => JSON.stringify([x.eventId ?? x["Event ID"] ?? "", String(x.teamName ?? x["Team Name"] ?? "").toLowerCase(), num(x.position ?? x.Position ?? x.rank), num(x.positionPoints ?? x["Position Points"]), num(x.kills ?? x.Kills), num(x.booyahs ?? x.Booyahs), num(x.totalPoints ?? x["Total Points"] ?? x.total ?? x.Total), bool(x.published ?? x.Published)]));
    if (data.rankings) verifyList(data.rankings, saved.rankings || [], "Community Rankings", (x: any) => JSON.stringify([String(x.teamId ?? x["Team ID"] ?? ""), String(x.teamName ?? x["Team Name"] ?? "").toLowerCase(), num(x.rank ?? x.Rank), num(x.communityScore ?? x["Community Score"] ?? x.communityPoints), num(x.championships ?? x.Championships), num(x.runnerUp ?? x["Runner-Up"]), num(x.secondRunnerUp ?? x["2nd Runner-Up"]), num(x.top5Finishes ?? x["Top 5 Finishes"])]));
    if (hasCollabs) verifyList(data.collaborators, saved.collaborators || [], "Collaborators", (x: any) => JSON.stringify(x));
    if (hasNews) verifyList(data.news, saved.news || [], "News", (x: any) => JSON.stringify(x));

    revalidateTag("tnffm-sheet");
    ["/", "/ranking", "/teams", "/tracked-events", "/admin", "/collaborators"].forEach(path => revalidatePath(path));

    const publishedEvents = hasEvents ? data.events.filter((e: any) => bool(e.published)) : [];
    const publishedResults = hasEvents ? data.rankingResults.filter((r: any) => bool(r.published)) : [];

    return NextResponse.json({
      ok: true,
      published: true,
      googleSheets: true,
      verified: true,
      rankingDetailsSaved: hasEvents,
      rankingsCalculated: Boolean(data.rankings),
      eventResultsCount: savedResults.length,
      publishedEventCount: publishedEvents.length,
      publishedResultCount: publishedResults.length,
      publishedAt: new Date().toISOString(),
      message: hasEvents
        ? `Ranking published successfully. ${publishedResults.length} published result${publishedResults.length === 1 ? "" : "s"} verified and Community Rankings rebuilt.`
        : "Changes saved and verified successfully."
    });
  } catch (error) {
    console.error("Google Sheets publish error:", error);
    return NextResponse.json({ ok: false, published: false, verified: false, message: error instanceof Error ? error.message : "Unable to publish and verify ranking." }, { status: 502 });
  }
}
