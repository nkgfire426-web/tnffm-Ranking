"use client";

/* eslint-disable @next/next/no-img-element */
import { Trophy } from "lucide-react";

type TeamLogoProps = {
  src: string;
  name: string;
  size?: number;
  champion?: boolean;
};

function normalizeImageUrl(src: string) {
  const value = String(src || "").trim();
  if (!value) return "";

  const driveFile = value.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (driveFile?.[1]) {
    return `https://drive.google.com/uc?export=view&id=${driveFile[1]}`;
  }

  const driveOpen = value.match(/[?&]id=([^&]+)/i);
  if (/drive\.google\.com/i.test(value) && driveOpen?.[1]) {
    return `https://drive.google.com/uc?export=view&id=${driveOpen[1]}`;
  }

  return value;
}

export function TeamLogo({ src, name, size = 48, champion = false }: TeamLogoProps) {
  const logoSrc = normalizeImageUrl(src) || `https://api.dicebear.com/8.x/shapes/svg?seed=${encodeURIComponent(name || "team")}`;

  return (
    <div
      className="relative grid shrink-0 place-items-center rounded-lg border border-white/10 bg-black/50 p-1"
      style={{ width: size, height: size }}
    >
      {champion && (
        <Trophy className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-gold p-1 text-black shadow-glow" />
      )}
      <img
        src={logoSrc}
        alt={`${name} logo`}
        width={size - 8}
        height={size - 8}
        className="h-full w-full rounded-md object-contain"
        onError={(event) => {
          const fallback = `https://api.dicebear.com/8.x/shapes/svg?seed=${encodeURIComponent(name || "team")}`;
          if (event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
        }}
      />
    </div>
  );
}
