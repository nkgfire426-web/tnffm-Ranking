import {
  getCachedSheetPayload,
  getLastSheetPayload,
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
  name: string;
  organizer: string;
  teams: number;
  prize: string;
  status: "Verified" | "Official" | "Pending" | "Rejected";
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
  const matches = Math.max(0, Math.floor(asNumber(event.matchesPlayed ?? event.MatchesPlayed, 0)));
  const results = parseResults(event.results ?? event.Results)
    .map((r) => {
      const kills = Math.max(0, Math.floor(asNumber(r.kills, 0)));
      const booyahs = Math.max(0, Math.floor(asNumber(r.booyahs, 0)));
      const positionPoints = Math.max(0, asNumber(r.positionPoints, 0));
      const rank = Math.max(1, Math.floor(asNumber(r.rank, 1)));
      return {
        teamName: String(r.teamName ?? "").trim(),
        ...(r.teamSlug ? { teamSlug: String(r.teamSlug).trim() } : {}),
        rank,
        positionPoints,
        kills,
        booyahs,
        killRatio: matches > 0 ? kills / matches : 0,
        booyahRatio: matches > 0 ? (booyahs / matches) * 100 : 0,
        total: positionPoints + kills,
      };
    })
    .filter((r) => r.teamName);

  return {
    name: String(event.name ?? event.Name ?? "").trim(),
    organizer: String(event.organizer ?? event.Organizer ?? "").trim(),
    teams: Math.max(0, Math.floor(asNumber(event.teams ?? event.Teams, results.length))),
    prize: String(event.prize ?? event.Prize ?? "").trim(),
    status: String(event.status ?? event.Status ?? "Pending") as TrackedEvent["status"],
    counted: String(event.counted ?? event.Counted ?? "").trim(),
    date: String(event.date ?? event.Date ?? "").trim(),
    ...(event.notes != null || event.Notes != null
      ? { notes: String(event.notes ?? event.Notes ?? "") }
      : {}),
    matchesPlayed: matches,
    published: asBoolean(event.published ?? event.Published),
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

  // The canonical Google Sheets reader in google-sheets.ts owns the network
  // request. Waiting for its in-flight request prevents a second Apps Script
  // call from the homepage's tracked-events section.
  const existingRequest = getSheetReadInFlight();
  if (existingRequest) {
    const payload = await existingRequest;
    return normalizeEvents(payload);
  }

  const rawUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!rawUrl) return null;

  // This path is only a safety net for a direct getTrackedEvents() call that
  // happens before the canonical reader starts. It still shares the same
  // cache/in-flight state and never falls back to bundled/demo events.
  const request = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(rawUrl, {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json", "Cache-Control": "no-cache, no-store, max-age=0" },
        signal: controller.signal,
      });
      if (!response.ok) return getLastSheetPayload();
      const payload = await response.json();
      if (!payload || payload.ok === false) return getLastSheetPayload();
      setCachedSheetPayload(payload);
      return payload;
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Google Sheets events read error:", error);
      }
      return getLastSheetPayload();
    } finally {
      clearTimeout(timeout);
    }
  })().finally(() => setSheetReadInFlight(null));

  setSheetReadInFlight(request);
  return normalizeEvents(await request);
}

export async function getTrackedEvents(): Promise<TrackedEvent[]> {
  const events = await fetchEventsFromGoogleSheets();
  // Public production data must come only from the live Google Sheets source.
  // An unavailable/empty source is represented as an empty list, never sample
  // or bundled demo content.
  return events ?? [];
}
