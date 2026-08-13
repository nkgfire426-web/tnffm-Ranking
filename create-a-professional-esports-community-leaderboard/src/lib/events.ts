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

export async function getTrackedEvents(): Promise<TrackedEvent[]> {
  try {
    const filePath = path.join(process.cwd(), "data", "events.json");
    const contents = await readFile(filePath, "utf8");
    const events = JSON.parse(contents) as TrackedEvent[];
    return Array.isArray(events) && events.length ? events : sampleEvents;
  } catch {
    return sampleEvents;
  }
}
