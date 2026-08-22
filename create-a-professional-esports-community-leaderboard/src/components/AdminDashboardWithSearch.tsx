"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminDashboard } from "./AdminDashboard";
import type { TrackedEvent } from "@/lib/events";
import type { RawTeam } from "@/lib/types";

type Collaborator = { name: string; role: string; logoUrl: string; url: string };

export function AdminDashboardWithSearch({
  initialTeams,
  initialEvents,
  initialCollaborators,
}: {
  initialTeams: RawTeam[];
  initialEvents: TrackedEvent[];
  initialCollaborators?: Collaborator[];
}) {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState<number | null>(null);

  useEffect(() => {
    const root = document.querySelector("[data-admin-dashboard]");
    if (!root) return;

    const cards = Array.from(root.querySelectorAll<HTMLElement>(".glass.rounded-xl.p-4"));
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      cards.forEach((card) => { card.style.display = ""; });
      setVisibleCount(null);
      return;
    }

    let matches = 0;
    cards.forEach((card) => {
      const inputValues = Array.from(card.querySelectorAll<HTMLInputElement>("input"))
        .map((input) => input.value)
        .join(" ");
      const text = `${card.textContent || ""} ${inputValues}`.toLowerCase();
      const match = text.includes(normalized);
      card.style.display = match ? "" : "none";
      if (match) matches += 1;
    });
    setVisibleCount(matches);
  }, [query]);

  return (
    <div data-admin-dashboard>
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="glass rounded-xl border border-gold/20 p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gold" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search teams, events, collaborators, players..."
                aria-label="Search admin dashboard"
                className="w-full rounded-lg border border-white/10 bg-black/45 py-3 pl-10 pr-10 text-white outline-none transition placeholder:text-slate-500 focus:border-gold/60"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {query && <p className="text-sm font-semibold text-gold sm:min-w-fit">{visibleCount ?? 0} result{visibleCount === 1 ? "" : "s"}</p>}
          </div>
        </div>
      </div>
      <AdminDashboard initialTeams={initialTeams} initialEvents={initialEvents} initialCollaborators={initialCollaborators} />
    </div>
  );
}
