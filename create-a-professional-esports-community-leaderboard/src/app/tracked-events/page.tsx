import { Header } from "@/components/Header";
import { getTrackedEvents } from "@/lib/events";

export const metadata = {
  title: "Tracked Events | TNFFM Community Rankings",
  description: "Verified and official events tracked for TNFFM Community Rankings."
};

// Events are backed by live Google Sheets data; keep this route dynamic.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TrackedEventsPage() {
  const events = await getTrackedEvents();

  return (
    <main className="min-w-0 overflow-x-hidden">
      <Header />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <p className="font-rajdhani text-xs font-bold uppercase tracking-[0.2em] text-gold sm:text-sm sm:tracking-[0.25em]">Verified Logs</p>
        <h1 className="mt-1 font-rajdhani text-4xl font-bold uppercase leading-none text-white sm:text-5xl">Tracked Events</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
          Tournament logs approved for ranking calculation. Only eligible finale or grand finals results are counted.
        </p>

        <div className="mt-7 hidden overflow-hidden rounded-lg glass sm:block">
          <div className="table-scrollbar">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr><th className="px-4 py-4">Event</th><th className="px-4 py-4">Date</th><th className="px-4 py-4">Organizer</th><th className="px-4 py-4">Teams</th><th className="px-4 py-4">Prize Pool</th><th className="px-4 py-4">Status</th><th className="px-4 py-4">Counted Result</th><th className="px-4 py-4">Notes</th></tr>
              </thead>
              <tbody>{events.map((event) => <tr key={`${event.name}-${event.date}`} className="border-t border-white/5 align-top">
                <td className="max-w-[240px] px-4 py-4 font-semibold text-white">{event.name}</td><td className="whitespace-nowrap px-4 py-4 text-slate-300">{event.date}</td><td className="max-w-[180px] px-4 py-4 text-slate-300">{event.organizer}</td><td className="px-4 py-4 text-slate-300">{event.teams}</td><td className="whitespace-nowrap px-4 py-4 text-slate-300">{event.prize}</td>
                <td className="px-4 py-4"><span className="inline-flex rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-bold text-gold">{event.status}</span></td><td className="max-w-[180px] px-4 py-4 text-slate-300">{event.counted}</td><td className="max-w-[260px] px-4 py-4 text-slate-400">{event.notes || "-"}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:hidden">
          {events.map((event) => <article key={`${event.name}-${event.date}`} className="glass min-w-0 rounded-xl p-4">
            <div className="flex min-w-0 items-start justify-between gap-3"><h2 className="min-w-0 flex-1 font-rajdhani text-xl font-bold uppercase leading-tight text-white">{event.name}</h2><span className="shrink-0 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-[10px] font-bold uppercase text-gold">{event.status}</span></div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="min-w-0 rounded-lg bg-black/25 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-500">Date</p><p className="mt-1 break-words text-sm text-slate-200">{event.date}</p></div><div className="min-w-0 rounded-lg bg-black/25 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-500">Teams</p><p className="mt-1 text-sm text-slate-200">{event.teams}</p></div>
              <div className="min-w-0 rounded-lg bg-black/25 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-500">Prize Pool</p><p className="mt-1 break-words text-sm text-slate-200">{event.prize}</p></div><div className="min-w-0 rounded-lg bg-black/25 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-500">Counted</p><p className="mt-1 break-words text-sm text-slate-200">{event.counted}</p></div>
            </div>
            <div className="mt-3 rounded-lg bg-black/25 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-500">Organizer</p><p className="mt-1 break-words text-sm text-slate-200">{event.organizer}</p></div>
            {event.notes && <p className="mt-3 break-words text-sm leading-6 text-slate-400">{event.notes}</p>}
          </article>)}
        </div>
      </section>
    </main>
  );
}
