import {
  getCachedSheetPayload,
  getSheetReadInFlight,
  setCachedSheetPayload,
  setSheetReadInFlight,
} from "./sheet-cache";

const COLLABORATOR_TIMEOUT_MS = 15000;

export type Collaborator = {
  collaboratorId: string;
  name: string;
  role: string;
  status: string;
  contact: string;
  logoUrl: string;
  url: string;
  instagram: string;
  updatedAt: string;
};

function value(item: any, ...keys: string[]) {
  for (const key of keys) {
    const result = item?.[key];
    if (result !== undefined && result !== null && String(result).trim() !== "") return String(result).trim();
  }
  return "";
}

export function normalizeCollaborator(item: any): Collaborator {
  return {
    collaboratorId: value(item, "collaboratorId", "Collaborator ID", "id"),
    name: value(item, "name", "Name"),
    role: value(item, "role", "Role") || "Partner",
    status: value(item, "status", "Status") || "Active",
    contact: value(item, "contact", "Contact", "email", "Email"),
    logoUrl: value(item, "logoUrl", "logoURL", "LogoURL", "logo", "Logo"),
    url: value(item, "url", "website", "Website", "webSite"),
    instagram: value(item, "instagram", "Instagram", "instagramUrl", "Instagram URL"),
    updatedAt: value(item, "updatedAt", "UpdatedAt", "updated")
  };
}

function isHiddenStatus(value: unknown) {
  const status = String(value ?? "").trim().toLowerCase();
  return ["hidden", "draft", "unpublished", "rejected", "inactive", "disabled"].includes(status);
}

function normalizeCollaborators(items: unknown) {
  if (!Array.isArray(items)) return [];
  return items
    .map(normalizeCollaborator)
    .filter((item) => item.name && !isHiddenStatus(item.status));
}

async function fetchCollaboratorsFromGoogleSheets(): Promise<Collaborator[] | null> {
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
  if (cached && Array.isArray(cached.collaborators)) return normalizeCollaborators(cached.collaborators);

  const existingRequest = getSheetReadInFlight();
  if (existingRequest) {
    const payload = await existingRequest;
    return Array.isArray(payload?.collaborators) ? normalizeCollaborators(payload.collaborators) : null;
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
      if (!payload || payload.ok === false) throw new Error(String(payload?.message || "Google Apps Script returned an unsuccessful response"));
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
  return Array.isArray(payload?.collaborators) ? normalizeCollaborators(payload.collaborators) : null;
}

export async function getCollaborators(): Promise<Collaborator[]> {
  return (await fetchCollaboratorsFromGoogleSheets()) ?? [];
}
