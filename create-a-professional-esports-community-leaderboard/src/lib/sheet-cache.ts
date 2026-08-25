type CacheEntry = { payload: any; expiresAt: number; storedAt: number };

// Keep the in-process cache intentionally short. It is used for request
// de-duplication and as a bounded transient-error safety net only.
const CACHE_TTL_MS = 5000;
const MAX_STALE_MS = 60000;

let cache: CacheEntry | null = null;
let inFlight: Promise<any | null> | null = null;

export function getCachedSheetPayload(): any | null {
  if (!cache) return null;
  return cache.expiresAt > Date.now() ? cache.payload : null;
}

export function getLastSheetPayload(): any | null {
  if (!cache) return null;
  return Date.now() - cache.storedAt <= MAX_STALE_MS ? cache.payload : null;
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
