import { readFile } from "fs/promises";
import path from "path";

async function fetchCollaboratorsFromGoogleSheets(): Promise<any[] | null> {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!url) return null;

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    if (!response.ok) return null;

    const payload = await response.json();
    return Array.isArray(payload?.collaborators) ? payload.collaborators : null;
  } catch (error) {
    console.error("Google Sheets collaborators read error:", error);
    return null;
  }
}

export async function getCollaborators() {
  const googleCollaborators = await fetchCollaboratorsFromGoogleSheets();
  if (googleCollaborators) return googleCollaborators;

  try {
    const dataPath = path.join(process.cwd(), "data", "collaborators.json");
    const buf = await readFile(dataPath, "utf8");
    return JSON.parse(buf);
  } catch {
    return [];
  }
}
