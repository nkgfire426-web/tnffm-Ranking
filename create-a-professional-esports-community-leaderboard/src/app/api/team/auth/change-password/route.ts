import { NextRequest, NextResponse } from "next/server";
import { getTeamSession, hashPassword } from "@/lib/team-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await getTeamSession();
  if (!session) return NextResponse.json({ ok: false, message: "Not logged in." }, { status: 401 });
  const { currentPassword, newPassword } = await request.json().catch(() => ({}));
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") return NextResponse.json({ ok: false, message: "Current and new passwords are required." }, { status: 400 });
  if (newPassword.length < 8) return NextResponse.json({ ok: false, message: "New password must be at least 8 characters." }, { status: 400 });
  if (currentPassword === newPassword) return NextResponse.json({ ok: false, message: "New password must be different from the current password." }, { status: 400 });
  const webhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhook) return NextResponse.json({ ok: false, message: "Google Sheets is not configured." }, { status: 503 });
  const response = await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ action: "changeTeamPassword", username: session.username, currentPasswordHash: hashPassword(currentPassword), newPasswordHash: hashPassword(newPassword) }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) return NextResponse.json({ ok: false, message: result.message || "Unable to change password." }, { status: 400 });
  return NextResponse.json(result);
}
