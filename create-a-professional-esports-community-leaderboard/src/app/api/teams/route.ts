import { NextResponse } from "next/server";
import { getRankedTeams } from "@/lib/google-sheets";

// Google Sheets is live data, so this route must never be prerendered.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const teams = await getRankedTeams();
  return NextResponse.json(
    {
      updatedAt: new Date().toISOString(),
      teams
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
