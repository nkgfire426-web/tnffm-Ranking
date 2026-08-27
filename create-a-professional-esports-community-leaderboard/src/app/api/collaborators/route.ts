import { NextResponse } from "next/server";
import { getCollaborators } from "@/lib/collaborators";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const collaborators = await getCollaborators();
    return NextResponse.json(collaborators, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
    });
  } catch (error) {
    console.error("Collaborators API error:", error);
    return NextResponse.json([], { status: 200 });
  }
}
