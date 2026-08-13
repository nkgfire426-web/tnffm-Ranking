import { Header } from "@/components/Header";

const pointRows = [
  ["1st Place", "Champion", "100 Points"],
  ["2nd Place", "Runner-Up", "70 Points"],
  ["3rd Place", "2nd Runner-Up", "50 Points"],
  ["4th - 5th Place", "Top 5 Finish", "25 Points"],
  ["6th - 10th Place", "Finalist", "15 Points"],
  ["Free Fire MAX Official Match", "Finalist", "100 Points"]
];

const tieBreakers = [
  "More Championships",
  "More Runner-Up finishes",
  "More 2nd Runner-Up finishes",
  "More Top 5 finishes",
  "Fewer events played"
];

export const metadata = {
  title: "Rank System | TNFFM Community Rankings",
  description: "Official TNFFM Community Score point distribution and tie-breaker rules."
};

export default function RankSystemPage() {
  return (
    <main>
      <Header />
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="font-rajdhani text-sm font-bold uppercase tracking-[0.25em] text-gold">Official TNFFM</p>
        <h1 className="font-rajdhani text-5xl font-bold uppercase text-white">Rank System</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          Community Score is calculated from final standings in verified TNFFM eligible tournaments. Only finale or grand finals results are used for ranking.
        </p>

        <div className="mt-8 glass overflow-hidden rounded-lg">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-5 py-4">Position</th>
                <th className="px-5 py-4">Designation</th>
                <th className="px-5 py-4">Points Awarded</th>
              </tr>
            </thead>
            <tbody>
              {pointRows.map(([position, designation, points]) => (
                <tr key={position} className="border-t border-white/5">
                  <td className="px-5 py-4 font-semibold text-white">{position}</td>
                  <td className="px-5 py-4 text-slate-300">{designation}</td>
                  <td className="px-5 py-4 font-rajdhani text-2xl font-bold text-gold">{points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="glass rounded-lg p-6">
            <h2 className="font-rajdhani text-3xl font-bold uppercase text-white">Tie Breaker Order</h2>
            <div className="mt-5 space-y-3">
              {tieBreakers.map((rule, index) => (
                <div key={rule} className="flex items-center gap-4 rounded-lg bg-black/35 p-4">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-gold font-bold text-black">{index + 1}</span>
                  <span className="font-semibold text-slate-200">{rule}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass rounded-lg p-6">
            <h2 className="font-rajdhani text-3xl font-bold uppercase text-white">Name Transfer Rule</h2>
            <p className="mt-4 leading-7 text-slate-300">
              Team names must remain consistent. Significant rebrands must be submitted for approval to ensure points are transferred correctly.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
