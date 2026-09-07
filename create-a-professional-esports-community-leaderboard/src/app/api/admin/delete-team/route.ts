import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { clearSheetPayloadCache } from "@/lib/sheet-cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const REQUEST_TIMEOUT_MS = 20_000;

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function callSheets(url: string, method: "GET" | "POST", body?: unknown) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache, no-store, max-age=0",
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      ...(method === "POST" ? { body: JSON.stringify(body ?? {}) } : {}),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { password?: string; teamSlug?: string };
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected || !safeEqual(String(body.password ?? ""), expected)) {
      return NextResponse.json({ ok: false, message: "Invalid admin password." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const teamSlug = String(body.teamSlug || "").trim().toLowerCase();
    if (!teamSlug) {
      return NextResponse.json({ ok: false, message: "Team slug is required." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim();
    if (!webhookUrl) {
      return NextResponse.json({ ok: false, message: "Google Sheets is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }

    const readResponse = await callSheets(webhookUrl, "GET");
    const current = await readResponse.json().catch(() => ({}));
    if (!readResponse.ok || current.ok === false) {
      return NextResponse.json({ ok: false, message: current.message || "Unable to read current teams." }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }

    const teams = Array.isArray(current.teams) ? current.teams : [];
    const accounts = Array.isArray(current.accounts) ? current.accounts : [];
    const filteredTeams = teams.filter((team: any) => String(team?.slug || "").trim().toLowerCase() !== teamSlug);
    const filteredAccounts = accounts.filter((account: any) => String(account?.teamSlug || account?.TeamSlug || "").trim().toLowerCase() !== teamSlug);

    if (filteredTeams.length === teams.length && filteredAccounts.length === accounts.length) {
      return NextResponse.json({ ok: false, message: "Team was not found in the registered Teams or TeamAccounts data." }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    const payload: Record<string, unknown[]> = { teams: filteredTeams };
    // Preserve accounts exactly when the current backend exposes them, while
    // removing only the account(s) belonging to the deleted team.
    if (Array.isArray(current.accounts)) payload.accounts = filteredAccounts;

    const writeResponse = await callSheets(webhookUrl, "POST", payload);
    const result = await writeResponse.json().catch(() => ({}));
    if (!writeResponse.ok || result.ok === false || result.saved === false) {
      return NextResponse.json({ ok: false, message: result.message || "Unable to remove the registered team." }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }

    // Verify the deletion with a fresh read before telling the admin it worked.
    const verifyResponse = await callSheets(webhookUrl, "GET");
    const verified = await verifyResponse.json().catch(() => ({}));
    const remainingTeams = Array.isArray(verified.teams) ? verified.teams : [];
    const stillPresent = remainingTeams.some((team: any) => String(team?.slug || "").trim().toLowerCase() === teamSlug);
    if (stillPresent) {
      return NextResponse.json({ ok: false, message: "The write completed but the team is still present after read-back verification." }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }

    clearSheetPayloadCache();
    return NextResponse.json(
      { ok: true, verified: true, teamSlug, message: "Team removed from registered Teams and linked account data. Event history was preserved." },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "Google Sheets request timed out." : error instanceof Error ? error.message : "Unable to remove team.";
    console.error("Admin delete team error:", error);
    return NextResponse.json({ ok: false, message }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
