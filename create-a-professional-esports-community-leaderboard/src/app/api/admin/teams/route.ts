import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import type { RawTeam } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as { password?: string; teams?: RawTeam[] };
    const expected = process.env.ADMIN_PASSWORD;

    // Fail closed. Never use a password embedded in source code.
    if (!expected) {
      return NextResponse.json({ ok: false, message: "Admin authentication is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    if (payload.password !== expected) {
      return NextResponse.json({ ok: false, message: "Invalid password." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    if (!Array.isArray(payload.teams)) {
      return NextResponse.json({ ok: false, message: "Teams must be an array." }, { status: 400 });
    }

    const dataDirectory = path.join(process.cwd(), "data");
    await mkdir(dataDirectory, { recursive: true });
    await writeFile(path.join(dataDirectory, "teams.json"), JSON.stringify(payload.teams, null, 2), "utf8");
    revalidatePath("/");
    revalidatePath("/admin");
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Legacy admin teams save error:", error);
    return NextResponse.json({ ok: false, message: "Unable to save teams." }, { status: 500 });
  }
}
