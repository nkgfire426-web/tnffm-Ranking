import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as { password?: string; teams?: any[]; events?: any[]; collaborators?: any[] };
  const expected = process.env.ADMIN_PASSWORD || "admin123";

  if (payload.password !== expected) {
    return NextResponse.json({ ok: false, message: "Invalid password." }, { status: 401 });
  }

  const dataDirectory = path.join(process.cwd(), "data");
  await mkdir(dataDirectory, { recursive: true });

  try {
    if (Array.isArray(payload.teams)) {
      await writeFile(path.join(dataDirectory, "teams.json"), JSON.stringify(payload.teams, null, 2), "utf8");
    }
    if (Array.isArray(payload.events)) {
      await writeFile(path.join(dataDirectory, "events.json"), JSON.stringify(payload.events, null, 2), "utf8");
    }
    if (Array.isArray(payload.collaborators)) {
      await writeFile(path.join(dataDirectory, "collaborators.json"), JSON.stringify(payload.collaborators, null, 2), "utf8");
    }

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/collaborators");

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, message: String(err) }, { status: 500 });
  }
}
