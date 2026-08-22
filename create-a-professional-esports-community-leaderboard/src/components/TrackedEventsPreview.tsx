import { CalendarDays, CheckCircle2 } from "lucide-react";
import type { TrackedEvent } from "@/lib/events";

export function TrackedEventsPreview({ events }: { events: TrackedEvent[] }) {
  const visibleEvents = [...events]
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    .slice(0, 6);

  return (
    <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
      <div className="glass rounded-xl p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="font-rajdhani text-sm font-bold uppercase tracking-[0.25em] text-gold">Verified Logs</p>
            <h2 className="font-rajdhani text-3xl font-bold uppercase text-white">Tracked Events</h2>
            <p className="mt-1 text-sm text-slate-400">Latest events currently counted in TNFFM tracking.</p>
          </div>
          <CalendarDays className="h-6 w-6 shrink-0 text-gold" />
        </div>

        {visibleEvents.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-black/25 p-5 text-sm text-slate-400">
            No tracked events are available yet.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleEvents.map((event) => (
              <article key={`${event.name}-${event.date}`} className="rounded-lg border border-white/10 bg-black/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 font-rajdhani text-xl font-bold uppercase leading-tight text-white">{event.name}</h3>
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-gold" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-white/[0.03] p-2.5">
                    <p className="uppercase tracking-wider text-slate-500">Date</p>
                    <p className="mt-1 text-slate-200">{event.date || "-"}</p>
                  </div>
                  <div className="rounded-md bg-white/[0.03] p-2.5">
                    <p className="uppercase tracking-wider text-slate-500">Teams</p>
                    <p className="mt-1 text-slate-200">{event.teams || 0}</p>
                  </div>
                  <div className="rounded-md bg-white/[0.03] p-2.5">
                    <p className="uppercase tracking-wider text-slate-500">Prize</p>
                    <p className="mt-1 text-slate-200">{event.prize || "-"}</p>
                  </div>
                  <div className="rounded-md bg-white/[0.03] p-2.5">
                    <p className="uppercase tracking-wider text-slate-500">Status</p>
                    <p className="mt-1 font-semibold text-gold">{event.status || "Pending"}</p>
                  </div>
                </div>
                <p className="mt-3 truncate text-xs text-slate-500">{event.organizer || "TNFFM"}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
