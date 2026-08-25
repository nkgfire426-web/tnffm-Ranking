type CacheEntry = { payload: any; expiresAt: number };

const CACHE_TTL_MS = 5000;

let cache: CacheEntry | null = null;
let inFlight: Promise<any | null> | null = null;

export function getCachedSheetPayload(): any | null {
  if (!cache) return null;
  return cache.expiresAt > Date.now() ? cache.payload : null;
}

export function getLastSheetPayload(): any | null {
  return cache?.payload ?? null;
}

export function setCachedSheetPayload(payload: any) {
  cache = { payload, expiresAt: Date.now() + CACHE_TTL_MS };
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
