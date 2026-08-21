import { NextRequest, NextResponse } from "next/server";
import { getTeamSession } from "@/lib/team-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const WEBHOOK_ENV = "GOOGLE_SHEETS_WEBHOOK_URL";

async function callWebhook(payload: Record<string, unknown>) {
  const webhook = process.env[WEBHOOK_ENV];
  if (!webhook) throw new Error("Google Sheets is not configured.");

  const response = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result?.ok === false) {
    throw new Error(result?.message || "Google Sheets request failed.");
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const mode = String(body.mode || "submit");

    if (mode === "list" || mode === "status") {
      const expected = process.env.ADMIN_PASSWORD;
      if (!expected || String(body.password || "") !== expected) {
        return NextResponse.json({ ok: false, message: "Invalid admin password." }, { status: 401 });
      }

      if (mode === "list") {
        const result = await callWebhook({ action: "listFeedback" });
        return NextResponse.json(result);
      }

      const feedbackId = String(body.feedbackId || "").trim();
      const status = String(body.status || "New").trim();
      if (!feedbackId || !["New", "Reviewing", "Resolved"].includes(status)) {
        return NextResponse.json({ ok: false, message: "Invalid feedback status update." }, { status: 400 });
      }

      const result = await callWebhook({ action: "updateFeedbackStatus", feedbackId, status });
      return NextResponse.json(result);
    }

    const session = await getTeamSession();
    if (!session) {
      return NextResponse.json({ ok: false, message: "Please log in as a team to send feedback." }, { status: 401 });
    }

    const type = String(body.type || "Suggestion").trim();
    const message = String(body.message || "").trim();
    const allowedTypes = ["Bug", "Ranking", "Team Profile", "Suggestion", "Other"];

    if (!allowedTypes.includes(type)) {
      return NextResponse.json({ ok: false, message: "Invalid feedback type." }, { status: 400 });
    }
    if (message.length < 5) {
      return NextResponse.json({ ok: false, message: "Please enter at least 5 characters." }, { status: 400 });
    }
    if (message.length > 2000) {
      return NextResponse.json({ ok: false, message: "Feedback must be 2000 characters or less." }, { status: 400 });
    }

    const result = await callWebhook({
      action: "submitFeedback",
      feedbackId: `FB-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      teamName: session.teamName,
      teamSlug: session.teamSlug,
      username: session.username,
      type,
      message,
      status: "New",
    });

    return NextResponse.json({ ok: true, message: result?.message || "Feedback sent successfully." });
  } catch (error) {
    console.error("Team feedback error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to send feedback." },
      { status: 500 }
    );
  }
}
