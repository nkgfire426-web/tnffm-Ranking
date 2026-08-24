"use client";

/* eslint-disable @next/next/no-img-element */
import { Trophy } from "lucide-react";

type TeamLogoProps = {
  src?: string | null;
  name: string;
  size?: number;
  champion?: boolean;
};

// TNFFM default logo: the uploaded Free Fire MAX logo stored in the repository.
const DEFAULT_LOGO = "/tnffm-default-logo.svg";

function cleanImageValue(src?: string | null) {
  let value = String(src || "").trim();
  const imageFormula = value.match(/^=IMAGE\(\s*["']([^"']+)["']/i);
  if (imageFormula?.[1]) value = imageFormula[1].trim();
  value = value.replace(/^['"]|['"]$/g, "").trim();
  return value;
}

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
    <div className="relative grid shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-black/50 p-1" style={{ width: size, height: size }}>
      {champion && <Trophy className="absolute -right-2 -top-2 z-10 h-5 w-5 rounded-full bg-gold p-1 text-black shadow-glow" />}
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
