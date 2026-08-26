import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

const text = (v: unknown) => String(v ?? "").trim();

async function callSheets(url: string, method: "GET" | "POST", body?: unknown) {
  const target = new URL(url);
  target.searchParams.set("_tnffm_verify", `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const response = await fetch(target.toString(), {
    method,
    cache: "no-store",
    headers: { Accept: "application/json", "Cache-Control": "no-cache", Pragma: "no-cache", ...(method === "POST" ? { "Content-Type": "application/json" } : {}) },
    ...(method === "POST" ? { body: JSON.stringify(body ?? {}) } : {})
  });
  const raw = await response.text();
  let data: any = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { /* handled below */ }
  if (!response.ok) throw new Error(`Google Apps Script HTTP error (${response.status}). ${text(data?.message || data?.error || raw).slice(0, 500)}`);
  if (!data || data.ok === false) throw new Error(`Google Sheet update failed. ${text(data?.message || data?.error || raw || "Apps Script returned an invalid response.").slice(0, 500)}`);
  return data;
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
    const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    if (!url) return NextResponse.json({ ok: false, message: "GOOGLE_SHEETS_WEBHOOK_URL is not configured." }, { status: 503 });

    const data: any = {};
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
    if (Array.isArray(data.rankingResults) || Array.isArray(data.results)) {
      const expected = data.rankingResults || data.results;
      verifyKeys(expected, fresh.rankingResults || fresh.results, "Event Results", x => text(x?.resultId ?? x?.id ?? x?.["Result ID"]));
    }

    revalidateTag("tnffm-sheet");
    for (const path of ["/", "/ranking", "/teams", "/tracked-events", "/admin", "/collaborators"]) revalidatePath(path);
    return NextResponse.json({ ...saved, ok: true, saved: true, verified: true, googleSheets: true });
  } catch (error) {
    console.error("Admin Google Sheets save error:", error);
    return NextResponse.json({ ok: false, saved: false, verified: false, message: error instanceof Error ? error.message : "Google Sheet update failed." }, { status: 502 });
  }
}
