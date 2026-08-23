"use client";

/* eslint-disable @next/next/no-img-element */
import { Trophy } from "lucide-react";

type TeamLogoProps = {
  src?: string | null;
  name: string;
  size?: number;
  champion?: boolean;
};

const DEFAULT_LOGO =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" rx="40" fill="#050505"/><path d="M34 56h188v144H34z" fill="#111" stroke="#f5c518" stroke-width="8"/><text x="128" y="132" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="54" font-weight="900" fill="#f5c518">FF</text><text x="128" y="176" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="25" font-weight="800" fill="#fff">MAX</text></svg>`
  );

function cleanImageValue(src?: string | null) {
  let value = String(src || "").trim();

  // Google Sheets can contain IMAGE("https://...") instead of the raw URL.
  // Never send the formula itself to the browser/proxy.
  const imageFormula = value.match(/^=IMAGE\(\s*["']([^"']+)["']/i);
  if (imageFormula?.[1]) value = imageFormula[1].trim();

  // Also support a URL accidentally wrapped in quotes by Sheets/admin input.
  value = value.replace(/^['"]|['"]$/g, "").trim();
  return value;
}

/**
 * Converts supported Google Drive sharing URLs into the same-origin image
 * proxy. Raw http(s) image URLs are kept unchanged.
 */
export function normalizeImageUrl(src?: string | null) {
  const value = cleanImageValue(src);
  if (!value) return DEFAULT_LOGO;

  if (/drive\.google\.com|drive\.usercontent\.google\.com/i.test(value)) {
    return `/api/team/logo?url=${encodeURIComponent(value)}`;
  }

  try {
    const parsed = new URL(value);
    if (!/^https?:$/.test(parsed.protocol)) return DEFAULT_LOGO;
    return parsed.toString();
  } catch {
    return DEFAULT_LOGO;
  }
}

export function TeamLogo({ src, name, size = 48, champion = false }: TeamLogoProps) {
  const logoSrc = normalizeImageUrl(src);

  return (
    <div
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-black/50 p-1"
      style={{ width: size, height: size }}
    >
      {champion && (
        <Trophy className="absolute -right-2 -top-2 z-10 h-5 w-5 rounded-full bg-gold p-1 text-black shadow-glow" />
      )}
      <img
        src={logoSrc}
        alt={`${name || "Team"} logo`}
        width={size - 8}
        height={size - 8}
        className="h-full w-full rounded-md object-contain"
        referrerPolicy="no-referrer"
        onError={(event) => {
          if (event.currentTarget.dataset.fallbackApplied === "true") return;
          event.currentTarget.dataset.fallbackApplied = "true";
          event.currentTarget.src = DEFAULT_LOGO;
        }}
      />
    </div>
  );
}
