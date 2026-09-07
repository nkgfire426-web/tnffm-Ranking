type CacheEntry = {
  payload: any;
  expiresAt: number;
  storedAt: number;
};

// The Apps Script layer already caches the unified payload for 20 seconds.
// Keep a matching server-side cache so several public pages/API calls during
// the same burst do not repeatedly wake Google Apps Script. A separate stale
// window lets the site remain usable during a short Sheets outage without
// silently serving old data during normal operation.
const CACHE_TTL_MS = 20_000;
const STALE_TTL_MS = 5 * 60_000;

let cache: CacheEntry | null = null;
let inFlight: Promise<any | null> | null = null;

export function getCachedSheetPayload(): any | null {
  if (!cache) return null;
  return cache.expiresAt > Date.now() ? cache.payload : null;
}

export function getLastSheetPayload(): any | null {
  if (!cache) return null;
  return cache.storedAt + STALE_TTL_MS > Date.now() ? cache.payload : null;
}

export function setCachedSheetPayload(payload: any) {
  const now = Date.now();
  cache = { payload, expiresAt: now + CACHE_TTL_MS, storedAt: now };
}

export function getSheetReadInFlight(): Promise<any | null> | null {
  return inFlight;
}

export function setSheetReadInFlight(request: Promise<any | null> | null) {
  inFlight = request;
}

export function clearSheetPayloadCache() {
  cache = null;
}
