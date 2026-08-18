import { Header } from "@/components/Header";
import { getTrackedEvents } from "@/lib/events";

export const metadata = {
  title: "Tracked Events | TNFFM Community Rankings",
  description: "Verified and official events tracked for TNFFM Community Rankings."
};

// Tracked events are read from live Google Sheets data.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TrackedEventsPage() {
  const events = await getTrackedEvents();

  return (
    <main>
      <Header />
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="font-rajdhani text-sm font-bold uppercase tracking-[0.25em] text-gold">Verified Logs</p>
        <h1 className="font-rajdhani text-5xl font-bold uppercase text-white">Tracked Events</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          Tournament logs approved for ranking calculation. Only eligible finale or grand finals results are counted.
        </p>

        <div className="mt-8 glass overflow-hidden rounded-lg">
          <table className="w-full min-w-[1020px] text-left text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-5 py-4">Event</th>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Organizer</th>
                <th className="px-5 py-4">Teams</th>
                <th className="px-5 py-4">Prize Pool</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Counted Result</th>
                <th className="px-5 py-4">Notes</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={`${event.name}-${event.date}`} className="border-t border-white/5">
                  <td className="px-5 py-4 font-semibold text-white">{event.name}</td>
                  <td className="px-5 py-4 text-slate-300">{event.date}</td>
                  <td className="px-5 py-4 text-slate-300">{event.organizer}</td>
                  <td className="px-5 py-4 text-slate-300">{event.teams}</td>
                  <td className="px-5 py-4 text-slate-300">{event.prize}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-bold text-gold">{event.status}</span>
                  </td>
                  <td className="px-5 py-4 text-slate-300">{event.counted}</td>
                  <td className="px-5 py-4 text-slate-400">{event.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
