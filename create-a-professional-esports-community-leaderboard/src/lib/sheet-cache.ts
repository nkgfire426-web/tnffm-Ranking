type CacheEntry = { payload: any; expiresAt: number; storedAt: number };

// Keep the cache short so every public page reflects the Google Sheet quickly.
// The cache only de-duplicates concurrent requests and avoids repeated reads
// during the same short request burst; it is never used as an old-data fallback.
const CACHE_TTL_MS = 2000;

let cache: CacheEntry | null = null;
let inFlight: Promise<any | null> | null = null;

export function getCachedSheetPayload(): any | null {
  if (!cache) return null;
  return cache.expiresAt > Date.now() ? cache.payload : null;
}

export function getLastSheetPayload(): any | null {
  // Kept for compatibility with existing imports. Public readers should not
  // use this as a stale-data fallback.
  return null;
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
