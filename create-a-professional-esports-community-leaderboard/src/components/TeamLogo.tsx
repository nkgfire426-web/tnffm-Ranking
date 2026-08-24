"use client";

/* eslint-disable @next/next/no-img-element */
import { Trophy } from "lucide-react";

type TeamLogoProps = {
  src?: string | null;
  name: string;
  size?: number;
  champion?: boolean;
};

// Official TNFFM default logo: the supplied Free Fire MAX logo.
const DEFAULT_LOGO =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1536 1536"><rect width="1536" height="1536" fill="#000"/><g fill="#ffb719"><path d="M1113 1000l1 3h62l34-22h5l24 22h63v-4l-35-32-11-14 69-45-62-2-36 22-26-22h-61v4l35 32 10 13z"/><path d="M907 1000l1 3h57l50-49 21 49h59l-32-90-5-7h-60z"/><path d="M693 1000l2 3h58l10-37 5-8 26 28 6-1 39-25-8 43h59l25-95h-59l-45 30-4-1-29-30h-58z"/><path d="M1417 360l-7-4H629l-24 6-13 8-15 16-9 19-241 903 2 11 6 4 203-35 21-10 16-16 12-27 101-375h446l19-3 29-18 141-171-2-8-7-5H776l-18-12-7-17 3-22 9-16 13-13 27-13h431l21-5 27-20 135-161 3-8z"/><path d="M1245 218l-5-3H426l-17 5-20 13-12 15-7 17-71 265-3 22 10 9h92l2 8-133 102-7 8-5 17 1 5h98l2 7-131 100-7 9-5 17 2 8h101l4 8-140 111-68 250 1 9 5 5 8 1 149-27 24-14 16-21 215-808 9-19 15-16 15-9 18-5h566l27-9 19-16 44-53z"/></g></svg>`
  );

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
