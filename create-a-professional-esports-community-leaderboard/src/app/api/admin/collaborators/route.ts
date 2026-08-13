import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as { password?: string; collaborators?: any[] };
  const expected = process.env.ADMIN_PASSWORD || "pooja";

  if (payload.password !== expected) {
    return NextResponse.json({ ok: false, message: "Invalid password." }, { status: 401 });
  }

  if (!Array.isArray(payload.collaborators)) {
    return NextResponse.json({ ok: false, message: "Collaborators must be an array." }, { status: 400 });
  }

  const dataDirectory = path.join(process.cwd(), "data");
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(path.join(dataDirectory, "collaborators.json"), JSON.stringify(payload.collaborators, null, 2), "utf8");
  revalidatePath("/");
  revalidatePath("/admin");

  return NextResponse.json({ ok: true });
}
