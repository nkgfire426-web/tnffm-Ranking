import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/team-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { username, email, newPassword } = await request.json().catch(() => ({}));
  if (typeof username !== "string" || typeof email !== "string" || typeof newPassword !== "string") return NextResponse.json({ ok: false, message: "Username, registered email and new password are required." }, { status: 400 });
  if (!email.trim()) return NextResponse.json({ ok: false, message: "Enter the email saved on your team account." }, { status: 400 });
  if (newPassword.length < 8) return NextResponse.json({ ok: false, message: "New password must be at least 8 characters." }, { status: 400 });

  const webhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhook) return NextResponse.json({ ok: false, message: "Google Sheets is not configured." }, { status: 503 });

  const response = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ action: "resetTeamPassword", username: username.trim().toLowerCase(), email: email.trim().toLowerCase(), passwordHash: hashPassword(newPassword) }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) return NextResponse.json({ ok: false, message: result.message || "Unable to reset password." }, { status: 400 });
  return NextResponse.json(result);
}
