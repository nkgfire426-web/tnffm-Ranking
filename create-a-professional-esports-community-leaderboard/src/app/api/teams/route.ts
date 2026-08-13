import { NextResponse } from "next/server";
import { getRankedTeams } from "@/lib/google-sheets";

export const revalidate = 300;

export async function GET() {
  const teams = await getRankedTeams();
  return NextResponse.json({
    updatedAt: new Date().toISOString(),
    teams
  });
}
