import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { RawTeam } from "@/lib/types";

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as { password?: string; teams?: RawTeam[] };
  const expected = process.env.ADMIN_PASSWORD || "admin123";

  if (payload.password !== expected) {
    return NextResponse.json({ ok: false, message: "Invalid password." }, { status: 401 });
  }

  if (!Array.isArray(payload.teams)) {
    return NextResponse.json({ ok: false, message: "Teams must be an array." }, { status: 400 });
  }

  const dataDirectory = path.join(process.cwd(), "data");
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(path.join(dataDirectory, "teams.json"), JSON.stringify(payload.teams, null, 2), "utf8");
  revalidatePath("/");
  revalidatePath("/admin");

  return NextResponse.json({ ok: true });
}
