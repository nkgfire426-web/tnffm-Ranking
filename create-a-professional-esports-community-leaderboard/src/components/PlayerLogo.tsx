"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";

const DEFAULT_PLAYER_LOGO = "/tnffm-default-player.svg";

export function normalizePlayerLogoUrl(src?: string | null) {
  const value = String(src ?? "").trim();
  if (!value || /^(undefined|null|nan|false)$/i.test(value)) return DEFAULT_PLAYER_LOGO;
  if (/drive\.google\.com|drive\.usercontent\.google\.com/i.test(value)) return `/api/team/logo?url=${encodeURIComponent(value)}`;
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) ? url.toString() : DEFAULT_PLAYER_LOGO;
  } catch { return DEFAULT_PLAYER_LOGO; }
}

export function PlayerLogo({ src, name, size = 52 }: { src?: string | null; name: string; size?: number }) {
  const candidate = normalizePlayerLogoUrl(src);
  const [srcState, setSrcState] = useState(candidate);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setSrcState(candidate); setFailed(false); }, [candidate]);
  if (failed) return <div style={{ width: size, height: size }} className="shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40" aria-hidden="true" />;
  return <img src={srcState} alt={`${name || "Player"} logo`} width={size} height={size} loading="lazy" decoding="async" referrerPolicy="no-referrer" draggable={false} className="shrink-0 rounded-xl border border-white/10 bg-black/40 object-cover" onError={(event) => { const image = event.currentTarget; if (srcState !== DEFAULT_PLAYER_LOGO) { image.onerror = null; image.src = DEFAULT_PLAYER_LOGO; setSrcState(DEFAULT_PLAYER_LOGO); return; } image.removeAttribute("src"); image.style.visibility = "hidden"; setFailed(true); }} />;
}
