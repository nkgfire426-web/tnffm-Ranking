"use client";

/* eslint-disable @next/next/no-img-element */
import { Trophy } from "lucide-react";
import { useState } from "react";

type TeamLogoProps = {
  src?: string | null;
  name: string;
  size?: number;
  champion?: boolean;
};

// Keep this as the ONLY display fallback. A broken custom URL must never be
// written back to Google Sheets or replace the team's stored URL.
const DEFAULT_LOGO = "/tnffm-default-logo.svg";

function cleanImageValue(src?: string | null) {
  let value = String(src ?? "").trim();

  // Support Google Sheets IMAGE("url") values if one is returned by the API.
  const imageFormula = value.match(/^=IMAGE\(\s*["']([^"']+)["']/i);
  if (imageFormula?.[1]) value = imageFormula[1].trim();

  value = value.replace(/^['"]|['"]$/g, "").trim();
  return value;
}

export function normalizeImageUrl(src?: string | null) {
  const value = cleanImageValue(src);

  if (!value || /^(undefined|null|nan|false)$/i.test(value)) {
    return DEFAULT_LOGO;
  }

  // Google Drive logos are served through the existing same-origin proxy.
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

export function TeamLogo({
  src,
  name,
  size = 48,
  champion = false,
}: TeamLogoProps) {
  const candidate = normalizeImageUrl(src);
  const [imageSrc, setImageSrc] = useState(candidate);

  // React keeps the actual candidate URL stable until the input changes.
  // There is intentionally NO background Image() probe here: that used to
  // download every logo twice and could make the fallback appear first.
  const handleError = () => {
    setImageSrc((current) => (current === DEFAULT_LOGO ? current : DEFAULT_LOGO));
  };

  return (
    <div
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-black/50 p-1"
      style={{ width: size, height: size }}
    >
      {champion && (
        <Trophy className="absolute -right-2 -top-2 z-10 h-5 w-5 rounded-full bg-gold p-1 text-black shadow-glow" />
      )}

      <img
        src={imageSrc}
        alt={`${name || "Team"} logo`}
        width={Math.max(1, size - 8)}
        height={Math.max(1, size - 8)}
        className="h-full w-full rounded-md object-contain"
        referrerPolicy="no-referrer"
        decoding="async"
        loading="lazy"
        onError={handleError}
      />
    </div>
  );
}
