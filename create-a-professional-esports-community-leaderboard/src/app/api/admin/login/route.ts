import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { password?: string };
    const supplied = String(body.password ?? "");
    const expected = process.env.ADMIN_PASSWORD;

    if (!expected) {
      console.error("ADMIN_PASSWORD is not configured.");
      return NextResponse.json(
        { ok: false, message: "Admin login is not configured. Add ADMIN_PASSWORD in Vercel." },
        { status: 503 }
      );
    }

    if (!supplied || supplied !== expected) {
      return NextResponse.json(
        { ok: false, message: "Invalid admin password." },
        { status: 401 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { ok: false, message: "Invalid login request." },
      { status: 400 }
    );
  }
}
