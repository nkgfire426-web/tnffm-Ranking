import { NextResponse } from "next/server";
import { getTeamSession } from "@/lib/team-auth";
import { getRegisteredTeams } from "@/lib/google-sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getTeamSession();
    if (!session) {
      return NextResponse.json({ ok: false, message: "Not logged in." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const teams = await getRegisteredTeams();
    const team = teams.find((item) => String((item as any).slug || "").trim() === session.teamSlug);

    if (!team) {
      return NextResponse.json({ ok: false, message: "Team profile not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json(
      { ok: true, username: session.username, team },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Team session lookup error:", error);
    return NextResponse.json(
      { ok: false, message: "Unable to load your team profile right now." },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
