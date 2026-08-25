import {
  getCachedSheetPayload,
  getSheetReadInFlight,
  setCachedSheetPayload,
  setSheetReadInFlight,
} from "./sheet-cache";

export type EventResult = {
  teamName: string;
  teamSlug?: string;
  rank: number;
  positionPoints: number;
  kills: number;
  booyahs: number;
  killRatio: number;
  booyahRatio: number;
  total: number;
};

export type TrackedEvent = {
  id?: string;
  name: string;
  organizer: string;
  teams: number;
  prize: string;
  status: "Verified" | "Official" | "Pending" | "Rejected" | string;
  counted: string;
  date: string;
  notes?: string;
  matchesPlayed?: number;
  published?: boolean;
  results?: EventResult[];
};

function parseResults(value: unknown): EventResult[] {
  if (Array.isArray(value)) return value as EventResult[];
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as EventResult[]) : [];
  } catch {
    return [];
  }
}

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asBoolean(value: unknown) {
  if (value === true) return true;
  const text = String(value ?? "").trim().toLowerCase();
  return text === "true" || text === "yes" || text === "1" || text === "published";
}

function normalizeEvent(event: Record<string, unknown>): TrackedEvent {
  const matches = Math.max(
    0,
    Math.floor(asNumber(event.matchesPlayed ?? event.MatchesPlayed ?? event.matches ?? event.Matches, 0))
  );

  const results = parseResults(event.results ?? event.Results ?? event.resultData ?? event.ResultData)
    .map((result) => {
      // parseResults returns EventResult for normal data, but Google Sheets can
      // contain legacy result objects using alternate property names. Keep the
      // parser tolerant without making TypeScript reject those legacy fields.
      const r = result as EventResult & Record<string, unknown>;
      const kills = Math.max(0, Math.floor(asNumber(r.kills ?? r.Kills, 0)));
      const booyahs = Math.max(0, Math.floor(asNumber(r.booyahs ?? r.Booyahs, 0)));
      const positionPoints = Math.max(0, asNumber(r.positionPoints ?? r.PositionPoints, 0));
      const rank = Math.max(1, Math.floor(asNumber(r.rank ?? r.Rank, 1)));
      const rawTeamName = r.teamName ?? r.TeamName ?? r.team ?? r.Team ?? "";
      const rawTeamSlug = r.teamSlug ?? r.TeamSlug;
      const rawTotal = r.total ?? r.Total;

      return {
        teamName: String(rawTeamName).trim(),
        ...(rawTeamSlug ? { teamSlug: String(rawTeamSlug).trim() } : {}),
        rank,
        positionPoints,
        kills,
        booyahs,
        killRatio: matches > 0 ? kills / matches : 0,
        booyahRatio: matches > 0 ? (booyahs / matches) * 100 : 0,
        total: Number.isFinite(Number(rawTotal)) ? Number(rawTotal) : positionPoints + kills,
      };
    })
    .filter((result) => result.teamName);

  return {
    id: String(event.id ?? event.ID ?? event.eventId ?? event.EventID ?? "").trim() || undefined,
    name: String(event.name ?? event.Name ?? event.eventName ?? event.EventName ?? "").trim(),
    organizer: String(event.organizer ?? event.Organizer ?? event.organisedBy ?? event.OrganisedBy ?? "").trim(),
    teams: Math.max(
      0,
      Math.floor(asNumber(event.teams ?? event.Teams ?? event.teamCount ?? event.TeamCount, results.length))
    ),
    prize: String(event.prize ?? event.Prize ?? event.prizePool ?? event.PrizePool ?? "").trim(),
    status: String(event.status ?? event.Status ?? "Pending").trim() || "Pending",
    counted: String(event.counted ?? event.Counted ?? event.countedResult ?? event.CountedResult ?? "").trim(),
    date: String(event.date ?? event.Date ?? event.eventDate ?? event.EventDate ?? "").trim(),
    ...(event.notes != null || event.Notes != null || event.description != null || event.Description != null
      ? { notes: String(event.notes ?? event.Notes ?? event.description ?? event.Description ?? "") }
      : {}),
    matchesPlayed: matches,
    published: asBoolean(event.published ?? event.Published ?? event.isPublished ?? event.IsPublished),
    results,
  };
}

function normalizeEvents(payload: any): TrackedEvent[] | null {
  if (!payload || !Array.isArray(payload.events)) return null;
  return payload.events
    .map((event: Record<string, unknown>) => normalizeEvent(event))
    .filter((event: TrackedEvent) => event.name.length > 0);
}

async function fetchEventsFromGoogleSheets(): Promise<TrackedEvent[] | null> {
  const cachedPayload = getCachedSheetPayload();
  const cachedEvents = normalizeEvents(cachedPayload);
  if (cachedEvents !== null) return cachedEvents;

  const existingRequest = getSheetReadInFlight();
  if (existingRequest) return normalizeEvents(await existingRequest);

  const rawUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!rawUrl) {
    console.error("Tracked events: GOOGLE_SHEETS_WEBHOOK_URL is not configured");
    return null;
  }

  const request = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const url = new URL(rawUrl);
      url.searchParams.set("_tnffm_events", `${Date.now()}-${Math.random().toString(36).slice(2)}`);
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

      if (!response.ok) {
        console.error(`Tracked events Google Sheets read failed: HTTP ${response.status}`);
        return null;
      }

      const payload = await response.json();
      if (!payload || payload.ok === false) return null;
      setCachedSheetPayload(payload);
      return payload;
    } catch (error) {
      console.error("Google Sheets events read error:", error);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  })().finally(() => setSheetReadInFlight(null));

  setSheetReadInFlight(request);
  return normalizeEvents(await request);
}

export async function getTrackedEvents(): Promise<TrackedEvent[]> {
  return (await fetchEventsFromGoogleSheets()) ?? [];
}
