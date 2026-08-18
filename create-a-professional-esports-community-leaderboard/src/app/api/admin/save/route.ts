import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      password?: string;
      teams?: unknown[];
      events?: unknown[];
      collaborators?: unknown[];
    };

    const expected = process.env.ADMIN_PASSWORD;
    if (!expected || payload.password !== expected) {
      return NextResponse.json({ ok: false, message: "Invalid password." }, { status: 401 });
    }

    const data = {
      teams: Array.isArray(payload.teams) ? payload.teams : [],
      events: Array.isArray(payload.events) ? payload.events : [],
      collaborators: Array.isArray(payload.collaborators) ? payload.collaborators : []
    };

    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        { ok: false, message: "Google Sheets is not configured. Add GOOGLE_SHEETS_WEBHOOK_URL in Vercel." },
        { status: 503 }
      );
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(data)
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok === false) {
      return NextResponse.json(
        { ok: false, message: result.message || "Google Sheet update failed." },
        { status: 502 }
      );
    }

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/collaborators");

    return NextResponse.json({ ok: true, googleSheets: true });
  } catch (error) {
    console.error("Google Sheets save error:", error);
    return NextResponse.json({ ok: false, message: "Unable to update Google Sheet." }, { status: 500 });
  }
}
