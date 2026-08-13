import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), "data", "collaborators.json");
    const buf = await readFile(dataPath, "utf8");
    return NextResponse.json(JSON.parse(buf));
  } catch (err) {
    return NextResponse.json([]);
  }
}
