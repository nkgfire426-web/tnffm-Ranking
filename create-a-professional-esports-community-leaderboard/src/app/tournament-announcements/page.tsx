import Link from "next/link";
import { CalendarDays, Clock3, ExternalLink, Trophy, Users } from "lucide-react";
import { Header } from "@/components/Header";
import { getPublishedTrackedEvents, type TrackedEvent } from "@/lib/events";

export const metadata = {
  title: "Tournament Announcements | TNFFM Community Rankings",
  description: "Upcoming and officially published tournament announcements from the TNFFM community."
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getEventState(event: TrackedEvent) {
  const status = event.status.trim().toLowerCase();
  if (["official", "verified"].includes(status)) return "Official";
  if (status === "pending") return "Pending Review";
  return event.status || "Announced";
}

function isUpcoming(date: string) {
  if (!date) return true;
  const timestamp = Date.parse(date);
  return Number.isNaN(timestamp) ? true : timestamp >= Date.now();
}

function AnnouncementCard({ event }: { event: TrackedEvent }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-black/40 to-black/70 p-5 shadow-xl transition duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-[0_18px_50px_rgba(0,0,0,0.35)] sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gold/10 blur-3xl transition group-hover:bg-gold/15" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold">
            <Trophy className="h-6 w-6" />
          </div>
          <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-gold">
            {getEventState(event)}
          </span>
        </div>

        <h2 className="mt-5 font-rajdhani text-2xl font-bold uppercase leading-tight text-white sm:text-3xl">{event.name}</h2>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-400">{event.notes || "Official tournament information will be updated as details are confirmed."}</p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/5 bg-black/30 p-3">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500"><CalendarDays className="h-3.5 w-3.5" /> Date</div>
            <p className="mt-1 text-sm font-semibold text-slate-200">{event.date || "To be announced"}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/30 p-3">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500"><Trophy className="h-3.5 w-3.5" /> Prize Pool</div>
            <p className="mt-1 text-sm font-semibold text-gold">{event.prize || "To be announced"}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/30 p-3">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500"><Users className="h-3.5 w-3.5" /> Teams</div>
            <p className="mt-1 text-sm font-semibold text-slate-200">{event.teams || "TBA"}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/30 p-3">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500"><Clock3 className="h-3.5 w-3.5" /> Organizer</div>
            <p className="mt-1 truncate text-sm font-semibold text-slate-200">{event.organizer || "TNFFM Community"}</p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
          <span className="text-xs text-slate-500">{isUpcoming(event.date) ? "Upcoming tournament" : "Published announcement"}</span>
          <Link href="/tracked-events" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white transition hover:border-gold/40 hover:bg-gold hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
            Event details <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default async function TournamentAnnouncementsPage() {
  const events = await getPublishedTrackedEvents();
  const upcoming = events.filter((event) => isUpcoming(event.date));
  const displayed = upcoming.length > 0 ? upcoming : events;

  return (
    <main className="min-h-screen min-w-0 overflow-x-hidden">
      <Header />
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="max-w-3xl">
          <p className="font-rajdhani text-xs font-black uppercase tracking-[0.24em] text-gold sm:text-sm">TNFFM Community</p>
          <h1 className="mt-2 font-rajdhani text-4xl font-black uppercase leading-none text-white sm:text-6xl">Tournament Announcements</h1>
          <p className="mt-4 text-sm leading-6 text-slate-400 sm:text-base">Stay updated with officially published tournaments, prize pools, dates, organizers and participation details.</p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="glass rounded-xl p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Published</p><p className="mt-1 font-rajdhani text-3xl font-bold text-white">{events.length}</p></div>
          <div className="glass rounded-xl p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Upcoming</p><p className="mt-1 font-rajdhani text-3xl font-bold text-gold">{upcoming.length}</p></div>
          <div className="glass rounded-xl p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Source</p><p className="mt-1 font-rajdhani text-xl font-bold text-white">TNFFM Verified Data</p></div>
        </div>

        {displayed.length > 0 ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {displayed.map((event) => <AnnouncementCard key={`${event.id || event.name}-${event.date}`} event={event} />)}
          </div>
        ) : (
          <div className="glass mt-8 rounded-2xl p-10 text-center sm:p-16">
            <Trophy className="mx-auto h-10 w-10 text-gold" />
            <h2 className="mt-4 font-rajdhani text-2xl font-bold uppercase text-white">No tournament announcements yet</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">New officially published tournaments will appear here automatically when they are added to the TNFFM event data.</p>
            <Link href="/tracked-events" className="mt-6 inline-flex rounded-lg bg-gold px-5 py-3 text-sm font-black text-black transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">View Official Events</Link>
          </div>
        )}
      </section>
    </main>
  );
}
