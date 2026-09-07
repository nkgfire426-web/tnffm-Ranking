import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
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

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { ok: false, message: "Invalid login request." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
}
