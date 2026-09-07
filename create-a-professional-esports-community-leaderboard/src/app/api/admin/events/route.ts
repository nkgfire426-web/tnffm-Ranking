import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import type { TrackedEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as { password?: string; events?: TrackedEvent[] };
    const expected = process.env.ADMIN_PASSWORD;

    // Never fall back to a source-code password. This route is legacy and
    // should fail closed when the production secret is missing.
    if (!expected) {
      return NextResponse.json({ ok: false, message: "Admin authentication is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    if (payload.password !== expected) {
      return NextResponse.json({ ok: false, message: "Invalid password." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    if (!Array.isArray(payload.events)) {
      return NextResponse.json({ ok: false, message: "Events must be an array." }, { status: 400 });
    }

    const dataDirectory = path.join(process.cwd(), "data");
    await mkdir(dataDirectory, { recursive: true });
    await writeFile(path.join(dataDirectory, "events.json"), JSON.stringify(payload.events, null, 2), "utf8");
    revalidatePath("/tracked-events");
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Legacy admin events save error:", error);
    return NextResponse.json({ ok: false, message: "Unable to save events." }, { status: 500 });
  }
}
