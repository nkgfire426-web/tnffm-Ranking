import {
  getCachedSheetPayload,
  getSheetReadInFlight,
  setCachedSheetPayload,
  setSheetReadInFlight,
} from "./sheet-cache";

const COLLABORATOR_TIMEOUT_MS = 15000;

function isHiddenStatus(value: unknown) {
  const status = String(value ?? "").trim().toLowerCase();
  return ["hidden", "draft", "unpublished", "rejected", "inactive", "disabled"].includes(status);
}

async function fetchCollaboratorsFromGoogleSheets(): Promise<any[] | null> {
  const rawUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim();
  if (!rawUrl) {
    console.error("Collaborators: GOOGLE_SHEETS_WEBHOOK_URL is not configured");
    return null;
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    console.error("Collaborators: GOOGLE_SHEETS_WEBHOOK_URL is invalid");
    return null;
  }

  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec\/?$/i.test(url.origin + url.pathname)) {
    console.error("Collaborators: GOOGLE_SHEETS_WEBHOOK_URL must point to the deployed /exec web app");
    return null;
  }

  const cached = getCachedSheetPayload();
  if (cached && Array.isArray(cached.collaborators)) {
    return cached.collaborators.filter((item: any) => !isHiddenStatus(item?.status ?? item?.Status));
  }

  const existingRequest = getSheetReadInFlight();
  if (existingRequest) {
    const payload = await existingRequest;
    return Array.isArray(payload?.collaborators)
      ? payload.collaborators.filter((item: any) => !isHiddenStatus(item?.status ?? item?.Status))
      : null;
  }

  const request = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), COLLABORATOR_TIMEOUT_MS);
    try {
      url.searchParams.set("_tnffm_collaborators", `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      const response = await fetch(url.toString(), {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache, no-store, max-age=0",
          Pragma: "no-cache",
        },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Google Apps Script returned HTTP ${response.status}`);
      const payload = await response.json();
      if (!payload || payload.ok === false) {
        throw new Error(String(payload?.message || "Google Apps Script returned an unsuccessful response"));
      }
      setCachedSheetPayload(payload);
      return payload;
    } catch (error) {
      console.error("Google Sheets collaborators read error:", error);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  })().finally(() => setSheetReadInFlight(null));

  setSheetReadInFlight(request);
  const payload = await request;
  return Array.isArray(payload?.collaborators)
    ? payload.collaborators.filter((item: any) => !isHiddenStatus(item?.status ?? item?.Status))
    : null;
}

export async function getCollaborators() {
  // Google Sheets is the sole source of truth. Never silently fall back to
  // bundled JSON because that can display stale/fake collaborators after a
  // successful admin update.
  return (await fetchCollaboratorsFromGoogleSheets()) ?? [];
}
