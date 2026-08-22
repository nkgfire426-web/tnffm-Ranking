"use client";

/* eslint-disable @next/next/no-img-element */
import { Trophy } from "lucide-react";

type TeamLogoProps = {
  src?: string | null;
  name: string;
  size?: number;
  champion?: boolean;
};

const DEFAULT_FREE_FIRE_MAX_LOGO = "/brand/free-fire-max-logo.png";

function normalizeImageUrl(src?: string | null) {
  const value = String(src || "").trim();
  if (!value) return DEFAULT_FREE_FIRE_MAX_LOGO;

  if (/drive\.google\.com/i.test(value)) {
    return `/api/team/logo?url=${encodeURIComponent(value)}`;
  }

  return value;
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
        onError={(event) => {
          if (event.currentTarget.src !== DEFAULT_FREE_FIRE_MAX_LOGO) {
            event.currentTarget.src = DEFAULT_FREE_FIRE_MAX_LOGO;
          }
        }}
      />
    </div>
  );
}
