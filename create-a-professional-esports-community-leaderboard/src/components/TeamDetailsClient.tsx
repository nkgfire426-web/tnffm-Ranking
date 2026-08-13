"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { TeamLogo } from "./TeamLogo";
import { TeamProfile } from "./TeamProfile";
import type { RankedTeam } from "@/lib/types";

export function TeamDetailsClient({ teams }: { teams: RankedTeam[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<RankedTeam | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return teams.filter((t) => !q || t.teamName.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q));
  }, [teams, query]);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <div className="rounded-lg border border-white/8 p-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search teams by name or slug"
            className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white outline-none"
          />
          <div className="mt-4 max-h-[60vh] overflow-auto">
            {list.map((t) => (
              <button
                key={t.slug}
                onClick={() => setSelected(t)}
                className="group mb-2 flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-white/5"
              >
                <TeamLogo src={t.logoUrl} name={t.teamName} size={48} />
                <div>
                  <div className="font-semibold text-white">{t.teamName}</div>
                  <div className="text-xs text-slate-400">Rank #{t.rank} • {t.badge}</div>
                </div>
                <div className="ml-auto text-xs text-slate-500">{t.communityPoints.toLocaleString()} CP</div>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="lg:col-span-2">
        <div className="rounded-lg border border-white/8 bg-black/20 p-4">
          {selected ? (
            <TeamProfile team={selected} />
          ) : (
            <div className="p-8 text-center text-slate-400">Select a team to view details or <Link href="/#leaderboard" className="text-gold underline">visit the leaderboard</Link>.</div>
          )}
        </div>
      </div>
    </div>
  );
}
