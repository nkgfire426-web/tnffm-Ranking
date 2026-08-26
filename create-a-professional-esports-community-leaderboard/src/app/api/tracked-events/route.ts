import { NextResponse } from "next/server";
import { getPublishedTrackedEvents } from "@/lib/events";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const events = await getPublishedTrackedEvents();
    return NextResponse.json(
      { ok: true, events },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("Tracked events API error:", error);
    return NextResponse.json({ ok: false, events: [] }, { status: 500 });
  }
}
