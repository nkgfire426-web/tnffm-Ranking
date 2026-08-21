import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const expected = process.env.ADMIN_PASSWORD;
    const supplied = request.headers.get("x-admin-password") || "";

    if (!expected || supplied !== expected) {
      return NextResponse.json(
        { ok: false, message: "Invalid admin password." },
        { status: 401 }
      );
    }

    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Google Sheets is not configured. Add GOOGLE_SHEETS_WEBHOOK_URL in Vercel."
        },
        { status: 503 }
      );
    }

    const response = await fetch(webhookUrl, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" }
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result?.ok === false) {
      return NextResponse.json(
        {
          ok: false,
          message:
            result?.message ||
            `Google Apps Script returned ${response.status}.`
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        teams: Array.isArray(result?.teams) ? result.teams : [],
        events: Array.isArray(result?.events) ? result.events : [],
        collaborators: Array.isArray(result?.collaborators)
          ? result.collaborators
          : [],
        news: Array.isArray(result?.news) ? result.news : []
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
        }
      }
    );
  } catch (error) {
    console.error("Admin Google Sheets read error:", error);
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to read Google Sheets."
      },
      { status: 500 }
    );
  }
}
