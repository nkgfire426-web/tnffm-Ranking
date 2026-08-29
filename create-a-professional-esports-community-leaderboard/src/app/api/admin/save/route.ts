import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const text = (v: unknown) => String(v ?? "").trim();
const REQUEST_TIMEOUT_MS = 20000;

async function callSheets(url: string, method: "GET" | "POST", body?: unknown) {
  let target: URL;
  try { target = new URL(url); } catch { throw new Error("GOOGLE_SHEETS_WEBHOOK_URL is not a valid URL."); }
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec\/?$/i.test(target.origin + target.pathname)) {
    throw new Error("GOOGLE_SHEETS_WEBHOOK_URL must be the current deployed Google Apps Script Web App /exec URL.");
  }
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  target.searchParams.set("_tnffm_request", requestId);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(target.toString(), {
      method,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache, no-store, max-age=0",
        Pragma: "no-cache",
        "X-TNFFM-Request-ID": requestId,
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      ...(method === "POST" ? { body: JSON.stringify(body ?? {}) } : {}),
      signal: controller.signal,
    });
    const raw = await response.text();
    let data: any = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { /* handled below */ }
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Google Apps Script HTTP 404. The configured Web App deployment is missing, deleted, or outdated. Deploy the current Code.gs as a Web app (Execute as Me + Anyone) and replace GOOGLE_SHEETS_WEBHOOK_URL with the new /exec URL.");
      }
      throw new Error(`Google Apps Script HTTP error (${response.status}). ${text(data?.message || data?.error || raw).slice(0, 500)}`);
    }
    if (!data || data.ok === false) {
      throw new Error(`Google Sheet request failed. ${text(data?.message || data?.error || raw || "Apps Script returned an invalid response.").slice(0, 500)}`);
    }
    return data;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Google Apps Script request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds. Check the Web App deployment and Spreadsheet ID.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function keyOf(value: unknown) { return text(value); }
function teamIdOf(t: any) { return keyOf(t?.teamId ?? t?.["Team ID"]); }
function teamNameOf(t: any) { return keyOf(t?.teamName ?? t?.["Team Name"] ?? t?.Team); }
function teamKey(t: any) {
  const id = teamIdOf(t);
  const name = teamNameOf(t).toLowerCase();
  return id ? `id:${id.toLowerCase()}` : `name:${name}`;
}
function rankingKey(r: any) { return keyOf(r?.teamId ?? r?.["Team ID"]) || `name:${keyOf(r?.teamName ?? r?.["Team Name"] ?? r?.Team).toLowerCase()}`; }
function collaboratorKey(c: any) { return keyOf(c?.collaboratorId ?? c?.id ?? c?.["Collaborator ID"]) || `name:${keyOf(c?.name ?? c?.Name).toLowerCase()}`; }
function resultKey(r: any) { return keyOf(r?.resultId ?? r?.id ?? r?.["Result ID"]); }
function eventKey(e: any) { return keyOf(e?.eventId ?? e?.id ?? e?.["Event ID"]); }
function simpleKey(item: any, names: string[]) { for (const name of names) { const value = keyOf(item?.[name]); if (value) return value; } return ""; }

function verifyKeys(expected: any[], actual: any[], name: string, key: (v: any) => string) {
  if (!Array.isArray(actual)) throw new Error(`${name}: Google Sheets did not return a valid array.`);
  const expectedKeys = expected.map(key).filter(Boolean);
  const actualKeys = new Set(actual.map(key).filter(Boolean));
  const missing = expectedKeys.filter((k) => !actualKeys.has(k));
  if (missing.length) throw new Error(`${name} was written but read-back does not match. Missing record: ${missing[0]}`);
}

// A newly added team may not have a Team ID in the browser payload. Apps Script
// is allowed to assign one during the write, so verification must fall back to
// the normalized team name for ID-less payload records instead of comparing an
// artificial empty-ID key against the generated Sheet ID.
function verifyTeams(expected: any[], actual: any[]) {
  if (!Array.isArray(actual)) throw new Error("Teams: Google Sheets did not return a valid array.");
  const actualById = new Set(actual.map(teamIdOf).filter(Boolean).map((v) => v.toLowerCase()));
  const actualByName = new Set(actual.map(teamNameOf).filter(Boolean).map((v) => v.toLowerCase()));
  for (const team of expected) {
    const expectedId = teamIdOf(team).toLowerCase();
    const expectedName = teamNameOf(team).toLowerCase();
    if (!expectedId && !expectedName) continue;
    if (expectedId ? actualById.has(expectedId) || actualByName.has(expectedName) : actualByName.has(expectedName)) continue;
    throw new Error(`Teams was written but read-back does not match. Missing record: ${expectedId}|${expectedName}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const configuredPassword = process.env.ADMIN_PASSWORD;
    if (!configuredPassword || payload?.password !== configuredPassword) {
      return NextResponse.json({ ok: false, message: "Invalid password." }, { status: 401 });
    }

    const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim();
    if (!url) return NextResponse.json({ ok: false, message: "GOOGLE_SHEETS_WEBHOOK_URL is not configured." }, { status: 503 });

    const data: Record<string, any[]> = {};
    for (const key of ["teams", "rankings", "events", "rankingResults", "results", "news", "collaborators", "accounts", "submissions", "feedback"]) {
      if (Array.isArray(payload?.[key])) data[key] = payload[key];
    }
    if (!Object.keys(data).length) return NextResponse.json({ ok: false, message: "No supported data section was supplied." }, { status: 400 });

    const saved = await callSheets(url, "POST", data);
    if (saved?.verified === false || saved?.saved === false) {
      throw new Error(text(saved?.message || saved?.error || "Google Apps Script did not confirm the write."));
    }

    // Never tell the admin that a save succeeded until a fresh GET sees the records.
    const fresh = await callSheets(url, "GET");
    if (Array.isArray(data.teams)) verifyTeams(data.teams, fresh.teams);
    if (Array.isArray(data.rankings)) verifyKeys(data.rankings, fresh.rankings, "Rankings", rankingKey);
    if (Array.isArray(data.collaborators)) verifyKeys(data.collaborators, fresh.collaborators, "Collaborators", collaboratorKey);
    if (Array.isArray(data.news)) verifyKeys(data.news, fresh.news, "News", (x) => simpleKey(x, ["ID", "id"]));
    if (Array.isArray(data.events)) verifyKeys(data.events, fresh.events, "Events", eventKey);
    if (Array.isArray(data.rankingResults) || Array.isArray(data.results)) {
      verifyKeys(data.rankingResults || data.results, fresh.rankingResults || fresh.results, "Event Results", resultKey);
    }
    if (Array.isArray(data.accounts)) verifyKeys(data.accounts, fresh.accounts, "Team Accounts", (x) => simpleKey(x, ["Username", "username"]));
    if (Array.isArray(data.submissions)) verifyKeys(data.submissions, fresh.submissions, "Submissions", (x) => simpleKey(x, ["SubmissionID", "submissionId"]));
    if (Array.isArray(data.feedback)) verifyKeys(data.feedback, fresh.feedback, "Feedback", (x) => simpleKey(x, ["FeedbackID", "feedbackId"]));

    // Next.js 15/16 expects a single cache-tag argument here. Keep invalidation
    // best-effort so a verified Sheet write can never be reported as failed.
    try { revalidateTag("tnffm-sheet"); } catch { /* cache invalidation must not undo a verified save */ }
    for (const path of ["/", "/ranking", "/teams", "/tracked-events", "/admin", "/collaborators"]) {
      try { revalidatePath(path); } catch { /* invalidation failure must not undo a verified save */ }
    }

    return NextResponse.json(
      { ...saved, ok: true, saved: true, verified: true, googleSheets: true, readBackVerified: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Admin Google Sheets save error:", error);
    return NextResponse.json(
      { ok: false, saved: false, verified: false, readBackVerified: false, message: error instanceof Error ? error.message : "Google Sheet update failed." },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}