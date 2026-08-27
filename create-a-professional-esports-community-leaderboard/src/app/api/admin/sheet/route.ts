import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const REQUEST_TIMEOUT_MS = 20000;

const collaboratorValue = (item: any, ...keys: string[]) => {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
  }
  return "";
};

function normalizeCollaborators(items: unknown) {
  if (!Array.isArray(items)) return [];
  return items.map((item: any) => ({
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
    if (!expected || supplied !== expected) return NextResponse.json({ ok: false, message: "Invalid admin password." }, { status: 401 });

    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim();
    if (!webhookUrl) return NextResponse.json({ ok: false, message: "Google Sheets is not configured. Add GOOGLE_SHEETS_WEBHOOK_URL in Vercel." }, { status: 503 });

    let url: URL;
    try { url = new URL(webhookUrl); } catch { return NextResponse.json({ ok: false, message: "GOOGLE_SHEETS_WEBHOOK_URL is not a valid URL." }, { status: 503 }); }
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec\/?$/i.test(url.origin + url.pathname)) {
      return NextResponse.json({ ok: false, message: "GOOGLE_SHEETS_WEBHOOK_URL must be the current deployed Google Apps Script Web App /exec URL." }, { status: 503 });
    }

    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    url.searchParams.set("_tnffm_admin_read", requestId);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        method: "GET", cache: "no-store",
        headers: { Accept: "application/json", "Cache-Control": "no-cache, no-store, max-age=0", Pragma: "no-cache", "X-TNFFM-Request-ID": requestId },
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
      if (!result || typeof result !== "object") return NextResponse.json({ ok: false, message: "Google Apps Script returned HTTP 200 but not valid JSON. Check the Web App deployment and doGet()." }, { status: 502 });
      if (result.ok === false) return NextResponse.json({ ok: false, message: `Google Apps Script error: ${String(result.message || result.error || "Unknown Apps Script error").slice(0, 500)}` }, { status: 502 });

      return NextResponse.json({
        ok: true,
        teams: Array.isArray(result.teams) ? result.teams : [],
        rankings: Array.isArray(result.rankings) ? result.rankings : [],
        events: Array.isArray(result.events) ? result.events : [],
        rankingResults: Array.isArray(result.rankingResults) ? result.rankingResults : Array.isArray(result.results) ? result.results : [],
        results: Array.isArray(result.results) ? result.results : Array.isArray(result.rankingResults) ? result.rankingResults : [],
        collaborators: normalizeCollaborators(result.collaborators),
        news: Array.isArray(result.news) ? result.news : [],
        serverTime: typeof result.serverTime === "string" ? result.serverTime : new Date().toISOString(),
      }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", Pragma: "no-cache" } });
    } finally { clearTimeout(timeout); }
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "Google Sheets read timed out after 20 seconds. Check the Apps Script deployment, Spreadsheet ID, and Apps Script execution logs." : error instanceof Error ? error.message : "Unable to read Google Sheets.";
    console.error("Admin Google Sheets read error:", error);
    return NextResponse.json({ ok: false, message }, { status: 502 });
  }
}
