import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

const MAX_IMAGE_DATA_URL_LENGTH = 4_000_000;

async function persistLogo(
  webhookUrl: string,
  dataUrl: string,
  fileName: string
): Promise<string> {
  if (!dataUrl.startsWith("data:image/")) return dataUrl;
  if (dataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) {
    throw new Error("Logo is too large. Please upload an image smaller than about 3 MB.");
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ action: "uploadLogo", dataUrl, fileName })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok === false || !result.url) {
    throw new Error(result.message || "Google Drive logo upload failed.");
  }
  return String(result.url);
}

async function persistLogos(
  webhookUrl: string,
  teams: unknown[],
  collaborators: unknown[]
) {
  const normalizedTeams = await Promise.all(
    teams.map(async (team, index) => {
      const item = { ...(team as Record<string, unknown>) };
      if (typeof item.logoUrl === "string" && item.logoUrl.startsWith("data:image/")) {
        item.logoUrl = await persistLogo(webhookUrl, item.logoUrl, `team-logo-${index + 1}`);
      }
      if (typeof item.bannerUrl === "string" && item.bannerUrl.startsWith("data:image/")) {
        item.bannerUrl = await persistLogo(webhookUrl, item.bannerUrl, `team-banner-${index + 1}`);
      }
      return item;
    })
  );

  const normalizedCollaborators = await Promise.all(
    collaborators.map(async (collaborator, index) => {
      const item = { ...(collaborator as Record<string, unknown>) };
      if (typeof item.logoUrl === "string" && item.logoUrl.startsWith("data:image/")) {
        item.logoUrl = await persistLogo(webhookUrl, item.logoUrl, `collaborator-logo-${index + 1}`);
      }
      return item;
    })
  );

  return { normalizedTeams, normalizedCollaborators };
}

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

    const teams = Array.isArray(payload.teams) ? payload.teams : [];
    const events = Array.isArray(payload.events) ? payload.events : [];
    const collaborators = Array.isArray(payload.collaborators) ? payload.collaborators : [];

    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        { ok: false, message: "Google Sheets is not configured. Add GOOGLE_SHEETS_WEBHOOK_URL in Vercel." },
        { status: 503 }
      );
    }

    const { normalizedTeams, normalizedCollaborators } = await persistLogos(
      webhookUrl,
      teams,
      collaborators
    );

    const data = {
      teams: normalizedTeams,
      events,
      collaborators: normalizedCollaborators
    };

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

    return NextResponse.json({ ok: true, googleSheets: true, logosPersisted: true });
  } catch (error) {
    console.error("Google Sheets save error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to update Google Sheet." },
      { status: 500 }
    );
  }
}
