import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import type { TrackedEvent } from "@/lib/events";

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as { password?: string; events?: TrackedEvent[] };
  const expected = process.env.ADMIN_PASSWORD || "pooja";

  if (payload.password !== expected) {
    return NextResponse.json({ ok: false, message: "Invalid password." }, { status: 401 });
  }

  if (!Array.isArray(payload.events)) {
    return NextResponse.json({ ok: false, message: "Events must be an array." }, { status: 400 });
  }

  const dataDirectory = path.join(process.cwd(), "data");
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(path.join(dataDirectory, "events.json"), JSON.stringify(payload.events, null, 2), "utf8");
  revalidatePath("/tracked-events");

  return NextResponse.json({ ok: true });
}
