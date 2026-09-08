import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const REQUEST_TIMEOUT_MS = 20000;

const text = (value: unknown) => String(value ?? "").trim();

const collaboratorValue = (item: any, ...keys: string[]) => {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && text(value) !== "") return text(value);
  }
  return "";
};

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function normalizeRoster(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item: any) => ({
    playerId: collaboratorValue(item, "playerId", "Player ID", "id"),
    name: collaboratorValue(item, "name", "playerName", "Player Name"),
    uid: collaboratorValue(item, "uid", "UID"),
    role: collaboratorValue(item, "role", "Role"),
    playerLogoUrl: collaboratorValue(item, "playerLogoUrl", "Player Logo URL", "logoUrl", "Logo URL"),
    status: collaboratorValue(item, "status", "Status") || "Active",
    createdAt: collaboratorValue(item, "createdAt", "Created At", "CreatedAt"),
    updatedAt: collaboratorValue(item, "updatedAt", "Updated At", "UpdatedAt"),
  }));
}

function teamKey(item: any) {
  const id = collaboratorValue(item, "teamId", "Team ID");
  if (id) return `id:${id.toLowerCase()}`;
  const slug = collaboratorValue(item, "slug", "Slug");
  if (slug) return `slug:${slug.toLowerCase()}`;
  const name = collaboratorValue(item, "teamName", "Team Name", "Team");
  return name ? `name:${name.toLowerCase()}` : "";
}

function normalizeTeams(teams: unknown, rankings: unknown) {
  const rankingRows = arrayValue(rankings);
  const byKey = new Map<string, any>();
  for (const row of rankingRows) {
    const key = teamKey(row);
    if (key) byKey.set(key, row);
  }

  return arrayValue(teams)
    .map((raw: any) => {
      const ranking = byKey.get(teamKey(raw)) ||
        rankingRows.find((row: any) => {
          const a = collaboratorValue(raw, "teamName", "Team Name", "Team").toLowerCase();
          const b = collaboratorValue(row, "teamName", "Team Name", "Team").toLowerCase();
          return !!a && a === b;
        }) || {};

      const roster = normalizeRoster(raw?.roster ?? raw?.Roster);
      const teamName = collaboratorValue(raw, "teamName", "Team Name", "Team");

      return {
        ...raw,
        teamId: collaboratorValue(raw, "teamId", "Team ID") || collaboratorValue(ranking, "teamId", "Team ID"),
        teamName,
        slug: collaboratorValue(raw, "slug", "Slug") || collaboratorValue(ranking, "slug", "Slug"),
        logoUrl: collaboratorValue(raw, "logoUrl", "Logo URL", "LogoURL"),
        bannerUrl: collaboratorValue(raw, "bannerUrl", "Banner URL"),
        description: collaboratorValue(raw, "description", "Description"),
        mobileNumber: collaboratorValue(raw, "mobileNumber", "Mobile Number"),
        status: collaboratorValue(raw, "status", "Status") || "Active",
        registrationStatus: collaboratorValue(raw, "registrationStatus", "Registration Status") || "Registered",
        players: roster.length || Number(raw?.players ?? 0) || 0,
        roster,
        createdAt: collaboratorValue(raw, "createdAt", "Created At", "CreatedAt"),
        lastUpdated: collaboratorValue(raw, "lastUpdated", "updatedAt", "Updated At", "UpdatedAt"),
        // Official ranking values are merged for admin visibility only.
        // Registration/team profile data never creates ranking points.
        rank: Number(ranking?.rank ?? ranking?.Rank ?? 0) || 0,
        eventsPlayed: Number(ranking?.eventsPlayed ?? ranking?.["Events Played"] ?? 0) || 0,
        championships: Number(ranking?.championships ?? ranking?.Championships ?? 0) || 0,
        runnerUp: Number(ranking?.runnerUp ?? ranking?.["Runner-Up"] ?? 0) || 0,
        secondRunnerUp: Number(ranking?.secondRunnerUp ?? ranking?.["2nd Runner-Up"] ?? 0) || 0,
        top5Finishes: Number(ranking?.top5Finishes ?? ranking?.["Top 5 Finishes"] ?? 0) || 0,
        communityScore: Number(ranking?.communityScore ?? ranking?.["Community Score"] ?? 0) || 0,
        kills: Number(ranking?.kills ?? ranking?.Kills ?? raw?.kills ?? 0) || 0,
        booyahs: Number(ranking?.booyahs ?? ranking?.Booyahs ?? raw?.booyahs ?? 0) || 0,
        killRatio: Number(ranking?.killRatio ?? ranking?.["Kill Ratio"] ?? raw?.killRatio ?? 0) || 0,
        booyahRatio: Number(ranking?.booyahRatio ?? ranking?.["Booyah Ratio"] ?? raw?.booyahRatio ?? 0) || 0,
        positionPoints: Number(ranking?.positionPoints ?? ranking?.["Position Points"] ?? 0) || 0,
        totalPoints: Number(ranking?.totalPoints ?? ranking?.["Total Points"] ?? 0) || 0,
        matchesPlayed: Number(ranking?.matchesPlayed ?? ranking?.["Matches Played"] ?? 0) || 0,
        grandFinals: Number(ranking?.grandFinals ?? ranking?.["Grand Finals"] ?? 0) || 0,
        winRate: Number(ranking?.winRate ?? ranking?.["Win Rate"] ?? raw?.winRate ?? 0) || 0,
        eligible: ranking?.eligible ?? ranking?.Eligible ?? false,
      };
    })
    .filter((team: any) => team.teamName);
}

function normalizeCollaborators(items: unknown) {
  return arrayValue(items).map((item: any) => ({
    collaboratorId: collaboratorValue(item, "collaboratorId", "Collaborator ID", "id"),
    name: collaboratorValue(item, "name", "Name"),
    role: collaboratorValue(item, "role", "Role") || "Partner",
    status: collaboratorValue(item, "status", "Status") || "Active",
    contact: collaboratorValue(item, "contact", "Contact", "email", "Email"),
    logoUrl: collaboratorValue(item, "logoUrl", "logoURL", "LogoURL", "logo", "Logo"),
    url: collaboratorValue(item, "url", "website", "Website", "webSite"),
    instagram: collaboratorValue(item, "instagram", "Instagram", "instagramUrl", "Instagram URL"),
    updatedAt: collaboratorValue(item, "updatedAt", "UpdatedAt", "updated"),
  }));
}

export async function GET(request: NextRequest) {
  try {
    const expected = process.env.ADMIN_PASSWORD;
    const supplied = request.headers.get("x-admin-password") || "";
    if (!expected || supplied !== expected) {
      return NextResponse.json({ ok: false, message: "Invalid admin password." }, { status: 401 });
    }

    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim();
    if (!webhookUrl) {
      return NextResponse.json({ ok: false, message: "Google Sheets is not configured. Add GOOGLE_SHEETS_WEBHOOK_URL in Vercel." }, { status: 503 });
    }

    let url: URL;
    try { url = new URL(webhookUrl); } catch {
      return NextResponse.json({ ok: false, message: "GOOGLE_SHEETS_WEBHOOK_URL is not a valid URL." }, { status: 503 });
    }
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec\/?$/i.test(url.origin + url.pathname)) {
      return NextResponse.json({ ok: false, message: "GOOGLE_SHEETS_WEBHOOK_URL must be the current deployed Google Apps Script Web App /exec URL." }, { status: 503 });
    }

    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    url.searchParams.set("_tnffm_admin_read", requestId);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache, no-store, max-age=0",
          Pragma: "no-cache",
          "X-TNFFM-Request-ID": requestId,
        },
        signal: controller.signal,
      });
      const raw = await response.text();
      let result: any = null;
      try { result = raw ? JSON.parse(raw) : null; } catch { /* handled below */ }

      if (!response.ok) {
        const detail = response.status === 404
          ? "The Apps Script deployment URL is invalid, deleted, or points to an old deployment. Deploy the current Code.gs as a Web app (Execute as Me, access Anyone) and update GOOGLE_SHEETS_WEBHOOK_URL with its /exec URL."
          : `Google Apps Script returned HTTP ${response.status}.`;
        return NextResponse.json({ ok: false, message: detail }, { status: 502 });
      }
      if (!result || typeof result !== "object") {
        return NextResponse.json({ ok: false, message: "Google Apps Script returned HTTP 200 but not valid JSON. Check the Web App deployment and doGet()." }, { status: 502 });
      }
      if (result.ok === false) {
        return NextResponse.json({ ok: false, message: `Google Apps Script error: ${String(result.message || result.error || "Unknown Apps Script error").slice(0, 500)}` }, { status: 502 });
      }

      const teams = normalizeTeams(result.teams, result.rankings);
      const rankings = arrayValue(result.rankings);
      const events = arrayValue(result.events);
      const rankingResults = arrayValue(result.rankingResults).length
        ? arrayValue(result.rankingResults)
        : arrayValue(result.results);
      const collaborators = normalizeCollaborators(result.collaborators);
      const news = arrayValue(result.news);

      return NextResponse.json({
        ok: true,
        teams,
        // Alias retained so future admin UI sections can consume the exact
        // registered-team dataset without re-reading the Sheet.
        teamDetails: teams,
        rankings,
        events,
        rankingResults,
        results: rankingResults,
        collaborators,
        news,
        counts: {
          teams: teams.length,
          rankings: rankings.length,
          events: events.length,
          rankingResults: rankingResults.length,
          collaborators: collaborators.length,
          news: news.length,
          rosters: teams.reduce((total: number, team: any) => total + (Array.isArray(team.roster) ? team.roster.length : 0), 0),
        },
        serverTime: typeof result.serverTime === "string" ? result.serverTime : new Date().toISOString(),
      }, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
        },
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "Google Sheets read timed out after 20 seconds. Check the Apps Script deployment, Spreadsheet ID, and Apps Script execution logs."
      : error instanceof Error ? error.message : "Unable to read Google Sheets.";
    console.error("Admin Google Sheets read error:", error);
    return NextResponse.json({ ok: false, message }, { status: 502 });
  }
}
