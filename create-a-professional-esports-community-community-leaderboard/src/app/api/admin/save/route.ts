import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

const text = (v: unknown) => String(v ?? "").trim();

async function callSheets(url: string, method: "GET" | "POST", body?: unknown) {
  const target = new URL(url);
  target.searchParams.set("_tnffm_verify", `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const response = await fetch(target.toString(), { method, cache: "no-store", headers: { Accept: "application/json", "Cache-Control": "no-cache, no-store, max-age=0", Pragma: "no-cache", ...(method === "POST" ? { "Content-Type": "application/json" } : {}) }, ...(method === "POST" ? { body: JSON.stringify(body ?? {}) } : {}) });
  const raw = await response.text();
  let data: any = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { /* handled below */ }
  if (!response.ok) throw new Error(`Google Apps Script HTTP error (${response.status}). ${text(data?.message || data?.error || raw).slice(0, 500)}`);
  if (!data || data.ok === false) throw new Error(`Google Sheet update failed. ${text(data?.message || data?.error || raw || "Apps Script returned an invalid response.").slice(0, 500)}`);
  return data;
}

function teamIdentity(x: any) { return text(x?.teamId ?? x?.["Team ID"]) || `name:${text(x?.teamName ?? x?.["Team Name"] ?? x?.Team).toLowerCase()}`; }
function collaboratorIdentity(x: any) { return text(x?.collaboratorId ?? x?.id ?? x?.["Collaborator ID"]) || `name:${text(x?.name ?? x?.Name).toLowerCase()}`; }
function eventIdentity(x: any) { return text(x?.eventId ?? x?.id ?? x?.["Event ID"]) || `name:${text(x?.name ?? x?.eventName ?? x?.Name).toLowerCase()}`; }
function resultIdentity(x: any) { return text(x?.resultId ?? x?.id ?? x?.["Result ID"]) || `${text(x?.eventId ?? x?.["Event ID"])}|${text(x?.teamName ?? x?.["Team Name"]).toLowerCase()}|${text(x?.position ?? x?.Position ?? x?.rank)}`; }

function findActual(expected: any, actual: any[], identity: (x: any) => string) {
  const expectedId = identity(expected);
  const exact = actual.find((x) => identity(x) === expectedId);
  if (exact) return exact;
  const expectedName = text(expected?.teamName ?? expected?.["Team Name"] ?? expected?.name ?? expected?.Name).toLowerCase();
  if (expectedName) return actual.find((x) => text(x?.teamName ?? x?.["Team Name"] ?? x?.name ?? x?.Name).toLowerCase() === expectedName);
  return undefined;
}
function verifyRecords(expected: any[], actual: any[], name: string, identity: (x: any) => string) {
  if (!Array.isArray(actual)) throw new Error(`${name}: Google Sheets did not return a valid array.`);
  for (const item of expected) if (!findActual(item, actual, identity)) throw new Error(`${name} was written but read-back does not match. Missing record: ${identity(item)}`);
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const configuredPassword = process.env.ADMIN_PASSWORD;
    if (!configuredPassword || payload?.password !== configuredPassword) return NextResponse.json({ ok: false, message: "Invalid password." }, { status: 401 });
    const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    if (!url) return NextResponse.json({ ok: false, message: "GOOGLE_SHEETS_WEBHOOK_URL is not configured." }, { status: 503 });

    const data: any = {};
    for (const key of ["teams", "rankings", "events", "rankingResults", "results", "news", "collaborators", "accounts", "submissions", "feedback"]) if (Array.isArray(payload?.[key])) data[key] = payload[key];
    if (!Object.keys(data).length) return NextResponse.json({ ok: false, message: "No supported data section was supplied." }, { status: 400 });

    const saved = await callSheets(url, "POST", data);
    const fresh = await callSheets(url, "GET");

    if (Array.isArray(data.teams)) verifyRecords(data.teams, fresh.teams, "Teams", teamIdentity);
    if (Array.isArray(data.collaborators)) verifyRecords(data.collaborators, fresh.collaborators, "Collaborators", collaboratorIdentity);
    if (Array.isArray(data.news)) verifyRecords(data.news, fresh.news, "News", x => text(x?.ID ?? x?.id ?? x?.newsId) || `title:${text(x?.Title ?? x?.title).toLowerCase()}`);
    if (Array.isArray(data.events)) verifyRecords(data.events, fresh.events, "Events", eventIdentity);
    const expectedResults = Array.isArray(data.rankingResults) ? data.rankingResults : data.results;
    if (Array.isArray(expectedResults)) verifyRecords(expectedResults, fresh.rankingResults || fresh.results, "Event Results", resultIdentity);

    revalidateTag("tnffm-sheet");
    for (const path of ["/", "/ranking", "/teams", "/tracked-events", "/admin", "/collaborators"]) revalidatePath(path);
    return NextResponse.json({ ...saved, ok: true, saved: true, verified: true, googleSheets: true, teamCount: Array.isArray(fresh.teams) ? fresh.teams.length : undefined, collaboratorCount: Array.isArray(fresh.collaborators) ? fresh.collaborators.length : undefined, eventCount: Array.isArray(fresh.events) ? fresh.events.length : undefined });
  } catch (error) {
    console.error("Admin Google Sheets save error:", error);
    return NextResponse.json({ ok: false, saved: false, verified: false, message: error instanceof Error ? error.message : "Google Sheet update failed." }, { status: 502 });
  }
}
