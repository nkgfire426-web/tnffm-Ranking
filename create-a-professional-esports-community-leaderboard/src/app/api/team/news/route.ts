import { NextResponse } from "next/server";
import { getTournamentNews } from "@/lib/google-sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const news = await getTournamentNews();
    return NextResponse.json({ ok: true, news }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Team news API error:", error);
    return NextResponse.json({ ok: false, news: [], message: "Unable to load TNFFM news." }, { status: 500 });
  }
}
