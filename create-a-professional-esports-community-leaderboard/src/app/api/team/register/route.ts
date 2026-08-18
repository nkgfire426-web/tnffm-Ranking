import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/team-auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");
  const teamSlug = String(body.teamSlug || "").trim();
  const email = String(body.email || "").trim();
  if (password.length < 8) return NextResponse.json({ ok: false, message: "Password must be at least 8 characters." }, { status: 400 });
  const webhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhook) return NextResponse.json({ ok: false, message: "Google Sheets is not configured." }, { status: 503 });
  const response = await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ action: "registerTeam", username, passwordHash: hashPassword(password), teamSlug, email }) });
  const result = await response.json().catch(() => ({}));
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
