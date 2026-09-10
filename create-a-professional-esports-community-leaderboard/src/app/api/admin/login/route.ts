import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

const SESSION_COOKIE = "tnffm_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 8;

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

function createSession() {
  const secret = sessionSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured.");
  const issued = `${Date.now()}:${crypto.randomBytes(24).toString("hex")}`;
  const signature = crypto.createHmac("sha256", secret).update(issued).digest("hex");
  return `${Buffer.from(issued, "utf8").toString("base64url")}.${signature}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { password?: string };
    const supplied = String(body.password ?? "");
    const expected = process.env.ADMIN_PASSWORD;

    if (!expected) {
      console.error("ADMIN_PASSWORD is not configured.");
      return NextResponse.json(
        { ok: false, message: "Admin login is not configured. Add ADMIN_PASSWORD in Vercel." },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!supplied || !safeEqual(supplied, expected)) {
      return NextResponse.json(
        { ok: false, message: "Invalid admin password." },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set({
      name: SESSION_COOKIE,
      value: createSession(),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return response;
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { ok: false, message: "Invalid login request." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
}
