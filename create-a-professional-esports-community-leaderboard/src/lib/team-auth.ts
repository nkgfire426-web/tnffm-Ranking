import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "tnffm_team_session";

// Keep team login functional even when a dedicated Vercel secret has not been added yet.
// TEAM_AUTH_SECRET should still be set in production for a custom signing key.
function secret() {
  return process.env.TEAM_AUTH_SECRET || process.env.ADMIN_PASSWORD || "tnffm-team-session-v1";
}

export function hashPassword(password: string) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function createSession(username: string, teamSlug: string) {
  const payload = `${username}|${teamSlug}`;
  const signature = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  return Buffer.from(`${payload}|${signature}`).toString("base64url");
}

export function verifySession(value: string | undefined) {
  if (!value) return null;
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const parts = decoded.split("|");
    if (parts.length !== 3) return null;
    const [username, teamSlug, signature] = parts;
    const expected = crypto.createHmac("sha256", secret()).update(`${username}|${teamSlug}`).digest("hex");
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    return { username, teamSlug };
  } catch {
    return null;
  }
}

export async function getTeamSession() {
  const store = await cookies();
  return verifySession(store.get(COOKIE_NAME)?.value);
}

// Persistent browser login: closing the site/browser will not remove the session.
// The team remains signed in for 30 days unless they explicitly log out.
export function teamCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  };
}

export { COOKIE_NAME };
