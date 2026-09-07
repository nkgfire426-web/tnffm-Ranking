"use client";

/* eslint-disable @next/next/no-img-element */
import { CalendarDays, ChevronDown, ChevronUp, ExternalLink, Newspaper } from "lucide-react";
import { useState } from "react";
import { normalizeImageUrl } from "@/components/TeamLogo";

type NewsItem = {
  id?: string;
  title: string;
  description?: string;
  date?: string;
  type?: string;
  imageUrl?: string;
  link?: string;
};

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function NewsCard({ item, index }: { item: NewsItem; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const description = String(item.description || "").trim();
  const hasMore = description.length > 240;
  const preview = hasMore ? `${description.slice(0, 240).trimEnd()}…` : description;
  const imageUrl = normalizeImageUrl(item.imageUrl);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/45 shadow-glow transition duration-300 hover:-translate-y-1 hover:border-gold/30">
      <div className="relative aspect-[16/9] overflow-hidden bg-black">
        {!imageFailed && imageUrl ? (
          <img
            src={imageUrl}
            alt={item.title || "TNFFM News"}
            loading={index < 3 ? "eager" : "lazy"}
            referrerPolicy="no-referrer"
            decoding="async"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center bg-gradient-to-br from-gold/15 via-black to-black">
            <Newspaper className="h-12 w-12 text-gold/35" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full border border-gold/30 bg-black/80 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-gold backdrop-blur">
          {String(item.type || "News").trim() || "News"}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>{formatDate(item.date) || "TNFFM Update"}</span>
        </div>
        <h2 className="font-rajdhani text-2xl font-bold leading-tight text-white transition group-hover:text-gold">{item.title}</h2>

        {description ? (
          <div className="mt-3">
            <p className="whitespace-pre-line text-sm leading-6 text-slate-400">{expanded ? description : preview}</p>
            {hasMore && (
              <button type="button" onClick={() => setExpanded(value => !value)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-gold transition hover:text-white">
                {expanded ? "Show Less" : "Read More"}
                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Official TNFFM community update.</p>
        )}

        <div className="mt-auto pt-5">
          {item.link ? (
            <a href={item.link} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-xs font-black uppercase tracking-wider text-gold transition hover:bg-gold hover:text-black">
              Open Full Update <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Official TNFFM News</div>
          )}
        </div>
      </div>
    </article>
  );
}
