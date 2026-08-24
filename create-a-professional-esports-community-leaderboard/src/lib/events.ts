import { readFile } from "fs/promises";
import path from "path";

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

export const sampleEvents: TrackedEvent[] = [
  { name: "TNFFM Summer Clash Grand Finals", organizer: "TNFFM Verified", teams: 24, prize: "Rs.1500", status: "Verified", counted: "Finale Results", date: "2026-06-22", notes: "Full map event with public final standings." },
  { name: "South Zone Free Fire MAX League", organizer: "Approved Organizer", teams: 36, prize: "Rs.3000", status: "Verified", counted: "Grand Finals", date: "2026-07-06", notes: "Eligible grand finals results counted." },
  { name: "Tamil Nadu Elite Cup", organizer: "Approved Organizer", teams: 30, prize: "Rs.2000", status: "Verified", counted: "Grand Finals", date: "2026-07-20", notes: "Minimum team and prize rules satisfied." },
  { name: "Official Free Fire MAX Qualifier", organizer: "Official Match", teams: 48, prize: "Official", status: "Official", counted: "Finalist Bonus", date: "2026-08-01", notes: "Official finalist bonus applied." }
];

function withCacheBuster(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    url.searchParams.set("_tnffm_events", `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    return url.toString();
  } catch {
    return `${rawUrl}${rawUrl.includes("?") ? "&" : "?"}_tnffm_events=${Date.now()}`;
  }
}

function parseResults(value: unknown): EventResult[] {
  if (Array.isArray(value)) return value as EventResult[];
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as EventResult[] : [];
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
  const results = parseResults(event.results ?? event.Results).map((r) => {
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
      total: positionPoints + kills
    };
  }).filter((r) => r.teamName);

  return {
    name: String(event.name ?? event.Name ?? "").trim(),
    organizer: String(event.organizer ?? event.Organizer ?? "").trim(),
    teams: Math.max(0, Math.floor(asNumber(event.teams ?? event.Teams, results.length))),
    prize: String(event.prize ?? event.Prize ?? "").trim(),
    status: String(event.status ?? event.Status ?? "Pending") as TrackedEvent["status"],
    counted: String(event.counted ?? event.Counted ?? "").trim(),
    date: String(event.date ?? event.Date ?? "").trim(),
    ...(event.notes != null || event.Notes != null ? { notes: String(event.notes ?? event.Notes ?? "") } : {}),
    matchesPlayed: matches,
    published: asBoolean(event.published ?? event.Published),
    results
  };
}

async function fetchEventsFromGoogleSheets(): Promise<TrackedEvent[] | null> {
  const rawUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!rawUrl) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(rawUrl, {
      method: "GET",
      next: { revalidate: 15 },
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    if (!response.ok) return null;
    const payload = await response.json();
    if (payload?.ok === false) return null;
    const events = payload?.events;
    if (!Array.isArray(events)) return null;
    return events.map((event: Record<string, unknown>) => normalizeEvent(event)).filter((event: TrackedEvent) => event.name.length > 0);
  } catch (error) {
    if (error instanceof Error && error.name !== "AbortError") console.error("Google Sheets events read error:", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getTrackedEvents(): Promise<TrackedEvent[]> {
  const googleEvents = await fetchEventsFromGoogleSheets();
  if (googleEvents !== null) return googleEvents;
  if (process.env.GOOGLE_SHEETS_WEBHOOK_URL) return [];
  try {
    const filePath = path.join(process.cwd(), "data", "events.json");
    const contents = await readFile(filePath, "utf8");
    const events = JSON.parse(contents) as Record<string, unknown>[];
    return Array.isArray(events) ? events.map(normalizeEvent) : sampleEvents;
  } catch {
    return sampleEvents;
  }
}
