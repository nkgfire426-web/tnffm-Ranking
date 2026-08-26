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
  target.searchParams.set("_tnffm_verify", requestId);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(target.toString(), {
      method, cache: "no-store",
      headers: { Accept: "application/json", "Cache-Control": "no-cache, no-store, max-age=0", Pragma: "no-cache", "X-TNFFM-Request-ID": requestId, ...(method === "POST" ? { "Content-Type": "application/json" } : {}) },
      ...(method === "POST" ? { body: JSON.stringify(body ?? {}) } : {}),
      signal: controller.signal,
    });
    const raw = await response.text();
    let data: any = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { /* handled below */ }
    if (!response.ok) {
      if (response.status === 404) throw new Error("Google Apps Script HTTP 404. The configured Web App deployment is missing, deleted, or outdated. Deploy the current Code.gs as a Web app (Execute as Me + Anyone) and replace GOOGLE_SHEETS_WEBHOOK_URL with the new /exec URL.");
      throw new Error(`Google Apps Script HTTP error (${response.status}). ${text(data?.message || data?.error || raw).slice(0, 500)}`);
    }
    if (!data || data.ok === false) throw new Error(`Google Sheet update failed. ${text(data?.message || data?.error || raw || "Apps Script returned an invalid response.").slice(0, 500)}`);
    return data;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error(`Google Apps Script request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds. Check the Web App deployment and Spreadsheet ID.`);
    throw error;
  } finally { clearTimeout(timeout); }
}

function teamKey(t: any) { return `${text(t?.teamId ?? t?.["Team ID"])}|${text(t?.teamName ?? t?.["Team Name"] ?? t?.Team).toLowerCase()}`; }
function collaboratorKey(c: any) { return text(c?.collaboratorId ?? c?.id ?? c?.["Collaborator ID"]) || `name:${text(c?.name ?? c?.Name).toLowerCase()}`; }
function verifyKeys(expected: any[], actual: any[], name: string, key: (v: any) => string) {
  if (!Array.isArray(actual)) throw new Error(`${name}: Google Sheets did not return a valid array.`);
  const actualKeys = new Set(actual.map(key));
  const missing = expected.map(key).filter(k => !actualKeys.has(k));
  if (missing.length) throw new Error(`${name} was written but read-back does not match. Missing record: ${missing[0]}`);
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const configuredPassword = process.env.ADMIN_PASSWORD;
    if (!configuredPassword || payload?.password !== configuredPassword) return NextResponse.json({ ok: false, message: "Invalid password." }, { status: 401 });
    const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim();
    if (!url) return NextResponse.json({ ok: false, message: "GOOGLE_SHEETS_WEBHOOK_URL is not configured." }, { status: 503 });

    const data: Record<string, any[]> = {};
    for (const key of ["teams", "rankings", "events", "rankingResults", "results", "news", "collaborators", "accounts", "submissions", "feedback"]) {
      if (Array.isArray(payload?.[key])) data[key] = payload[key];
    }
    if (!Object.keys(data).length) return NextResponse.json({ ok: false, message: "No supported data section was supplied." }, { status: 400 });

    const saved = await callSheets(url, "POST", data);
    const fresh = await callSheets(url, "GET");

    if (Array.isArray(data.teams)) verifyKeys(data.teams, fresh.teams, "Teams", teamKey);
    if (Array.isArray(data.collaborators)) verifyKeys(data.collaborators, fresh.collaborators, "Collaborators", collaboratorKey);
    if (Array.isArray(data.news)) verifyKeys(data.news, fresh.news, "News", x => text(x?.ID ?? x?.id));
    if (Array.isArray(data.events)) verifyKeys(data.events, fresh.events, "Events", x => text(x?.eventId ?? x?.id ?? x?.["Event ID"]));
    if (Array.isArray(data.rankingResults) || Array.isArray(data.results)) verifyKeys(data.rankingResults || data.results, fresh.rankingResults || fresh.results, "Event Results", x => text(x?.resultId ?? x?.id ?? x?.["Result ID"]));

    try { revalidateTag("tnffm-sheet", "max"); } catch { /* supported across Next.js versions */ }
    for (const path of ["/", "/ranking", "/teams", "/tracked-events", "/admin", "/collaborators"]) {
      try { revalidatePath(path); } catch { /* one path must not invalidate an otherwise successful save */ }
    }
    return NextResponse.json({ ...saved, ok: true, saved: true, verified: true, googleSheets: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin Google Sheets save error:", error);
    return NextResponse.json({ ok: false, saved: false, verified: false, message: error instanceof Error ? error.message : "Google Sheet update failed." }, { status: 502 });
  }
}
