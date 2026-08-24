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

const DEFAULT_LOGO = "/tnffm-default-logo.svg";

function cleanImageValue(src?: string | null) {
  let value = String(src ?? "").trim();
  const imageFormula = value.match(/^=IMAGE\(\s*["']([^"']+)["']/i);
  if (imageFormula?.[1]) value = imageFormula[1].trim();
  return value.replace(/^['"]|['"]$/g, "").trim();
}

export function normalizeImageUrl(src?: string | null) {
  const value = cleanImageValue(src);
  if (!value || /^(undefined|null|nan|false)$/i.test(value)) return DEFAULT_LOGO;

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

export function TeamLogo({ src, name, size = 48, champion = false }: TeamLogoProps) {
  const candidate = normalizeImageUrl(src);
  const [imageSrc, setImageSrc] = useState(candidate);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setImageSrc(candidate);
    setFailed(false);
  }, [candidate]);

  const handleError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;

    // If the custom/proxy image fails, replace it synchronously on the actual
    // DOM node. This prevents the browser's broken-image icon from remaining
    // visible for a render while React updates state.
    if (image.src !== new URL(DEFAULT_LOGO, window.location.href).href) {
      image.onerror = null;
      image.src = DEFAULT_LOGO;
      setImageSrc(DEFAULT_LOGO);
      setFailed(false);
      return;
    }

    // The local fallback itself should always exist. If it somehow cannot be
    // loaded, remove the failed image rather than showing a broken-image icon.
    image.removeAttribute("src");
    image.style.visibility = "hidden";
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

      {!failed && (
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
      )}
    </div>
  );
}
