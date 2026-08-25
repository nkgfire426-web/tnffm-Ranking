type CacheEntry = { payload: any; expiresAt: number; storedAt: number };

// Keep the in-process cache intentionally short. The durable Next/Vercel
// request cache remains the primary performance layer; this cache is for
// request de-duplication and a very short transient-error safety net.
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
  cache = {
    payload,
    expiresAt: Date.now() + CACHE_TTL_MS,
    storedAt: Date.now(),
  };
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
