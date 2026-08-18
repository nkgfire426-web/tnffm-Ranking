import { readFile } from "fs/promises";
import path from "path";

export type TrackedEvent = {
  name: string;
  organizer: string;
  teams: number;
  prize: string;
  status: "Verified" | "Official" | "Pending" | "Rejected";
  counted: string;
  date: string;
  notes?: string;
};

export const sampleEvents: TrackedEvent[] = [
  { name: "TNFFM Summer Clash Grand Finals", organizer: "TNFFM Verified", teams: 24, prize: "Rs.1500", status: "Verified", counted: "Finale Results", date: "2026-06-22", notes: "Full map event with public final standings." },
  { name: "South Zone Free Fire MAX League", organizer: "Approved Organizer", teams: 36, prize: "Rs.3000", status: "Verified", counted: "Grand Finals", date: "2026-07-06", notes: "Eligible grand finals results counted." },
  { name: "Tamil Nadu Elite Cup", organizer: "Approved Organizer", teams: 30, prize: "Rs.2000", status: "Verified", counted: "Grand Finals", date: "2026-07-20", notes: "Minimum team and prize rules satisfied." },
  { name: "Official Free Fire MAX Qualifier", organizer: "Official Match", teams: 48, prize: "Official", status: "Official", counted: "Finalist Bonus", date: "2026-08-01", notes: "Official finalist bonus applied." }
];

async function fetchEventsFromGoogleSheets(): Promise<TrackedEvent[] | null> {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!url) return null;

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    if (!response.ok) return null;

    const payload = await response.json();
    const events = payload?.events;
    return Array.isArray(events) ? (events as TrackedEvent[]) : null;
  } catch (error) {
    console.error("Google Sheets events read error:", error);
    return null;
  }
}

export async function getTrackedEvents(): Promise<TrackedEvent[]> {
  const googleEvents = await fetchEventsFromGoogleSheets();
  if (googleEvents) return googleEvents;

  try {
    const filePath = path.join(process.cwd(), "data", "events.json");
    const contents = await readFile(filePath, "utf8");
    const events = JSON.parse(contents) as TrackedEvent[];
    return Array.isArray(events) && events.length ? events : sampleEvents;
  } catch {
    return sampleEvents;
  }
}
