"use client";

/* eslint-disable @next/next/no-img-element */
import { Trophy } from "lucide-react";
import { useEffect, useState } from "react";

type TeamLogoProps = {
  src?: string | null;
  name: string;
  size?: number;
  champion?: boolean;
};

// Display-only fallback. This value is NEVER written back to Google Sheets.
const DEFAULT_LOGO = "/tnffm-default-logo.svg";

function cleanImageValue(src?: string | null) {
  let value = String(src ?? "").trim();

  // Accept Google Sheets IMAGE("url") values if one reaches the frontend.
  const imageFormula = value.match(/^=IMAGE\(\s*["']([^"']+)["']/i);
  if (imageFormula?.[1]) value = imageFormula[1].trim();

  return value.replace(/^['"]|['"]$/g, "").trim();
}

export function normalizeImageUrl(src?: string | null) {
  const value = cleanImageValue(src);

  if (!value || /^(undefined|null|nan|false)$/i.test(value)) {
    return DEFAULT_LOGO;
  }

  // Keep Google Drive support through the existing same-origin proxy.
  if (/drive\.google\.com|drive\.usercontent\.google\.com/i.test(value)) {
    return `/api/team/logo?url=${encodeURIComponent(value)}`;
  }

  try {
    const parsed = new URL(value);
    return /^https?:$/.test(parsed.protocol) ? parsed.toString() : DEFAULT_LOGO;
  } catch {
    return DEFAULT_LOGO;
  }
}

export function TeamLogo({
  src,
  name,
  size = 48,
  champion = false,
}: TeamLogoProps) {
  const candidate = normalizeImageUrl(src);
  const [imageSrc, setImageSrc] = useState(candidate);
  const [failed, setFailed] = useState(candidate === DEFAULT_LOGO);

  // Reset when a different team/logo value is supplied to the same component.
  useEffect(() => {
    setImageSrc(candidate);
    setFailed(candidate === DEFAULT_LOGO);
  }, [candidate]);

  const handleError = () => {
    setImageSrc(DEFAULT_LOGO);
    setFailed(true);
  };

  return (
    <div
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-black/50 p-1"
      style={{ width: size, height: size }}
    >
      {champion && (
        <Trophy className="absolute -right-2 -top-2 z-10 h-5 w-5 rounded-full bg-gold p-1 text-black shadow-glow" />
      )}

      {/* IMPORTANT: only ONE image is rendered at a time.
          We do NOT place the default logo underneath a custom logo, because
          transparent custom logos would otherwise reveal the default logo. */}
      <img
        key={imageSrc}
        src={imageSrc}
        alt={`${name || "Team"} logo`}
        width={Math.max(1, size - 8)}
        height={Math.max(1, size - 8)}
        className="relative z-[1] h-[calc(100%-0.5rem)] w-[calc(100%-0.5rem)] rounded-md object-contain"
        referrerPolicy="no-referrer"
        decoding="async"
        loading="lazy"
        draggable={false}
        onError={handleError}
      />

      {/* If even the local fallback asset cannot load, keep the container
          clean instead of ever displaying the browser's broken-image icon. */}
      {failed && imageSrc === DEFAULT_LOGO ? null : null}
    </div>
  );
}
