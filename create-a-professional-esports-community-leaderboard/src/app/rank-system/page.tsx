import { Header } from "@/components/Header";

const pointRows = [
  ["1st Place", "Champion", "100 Points"],
  ["2nd Place", "Runner-Up", "70 Points"],
  ["3rd Place", "2nd Runner-Up", "50 Points"],
  ["4th - 5th Place", "Top 5 Finish", "25 Points"],
  ["6th - 18th Place", "Finalist", "15 Points"]
];

const tieBreakers = [
  "More Championships",
  "More Runner-Up finishes",
  "More 2nd Runner-Up finishes",
  "More Top 5 finishes",
  "Fewer official events played"
];

export const metadata = {
  title: "Rank System | TNFFM Community Rankings",
  description: "Official TNFFM ranking rules for recognized collaborator events."
};

export default function RankSystemPage() {
  return (
    <main className="min-w-0 overflow-x-hidden">
      <Header />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <p className="font-rajdhani text-xs font-bold uppercase tracking-[0.2em] text-gold sm:text-sm sm:tracking-[0.25em]">Official TNFFM</p>
        <h1 className="mt-1 font-rajdhani text-4xl font-bold uppercase leading-none text-white sm:text-5xl">Official Ranking System</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
          TNFFM competitive ranking is separate from team registration. Only verified final standings from official events created or approved through TNFFM Collaborators can contribute ranking points. A team can be registered in the Tamil Community Showcase without being ranked.
        </p>

        <div className="mt-7 hidden overflow-hidden rounded-xl glass sm:block">
          <div className="table-scrollbar">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-5 py-4">Position</th><th className="px-5 py-4">Designation</th><th className="px-5 py-4">Points Awarded</th></tr></thead>
              <tbody>{pointRows.map(([position, designation, points]) => <tr key={position} className="border-t border-white/5"><td className="px-5 py-4 font-semibold text-white">{position}</td><td className="px-5 py-4 text-slate-300">{designation}</td><td className="px-5 py-4 font-rajdhani text-2xl font-bold text-gold">{points}</td></tr>)}</tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:hidden">{pointRows.map(([position, designation, points], index) => <article key={position} className="glass flex min-w-0 items-center gap-3 rounded-xl p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold font-bold text-black">{index + 1}</span><div className="min-w-0 flex-1"><p className="break-words font-semibold leading-tight text-white">{position}</p><p className="mt-1 break-words text-xs text-slate-400">{designation}</p></div><strong className="shrink-0 font-rajdhani text-xl font-bold text-gold">{points}</strong></article>)}</div>

        <div className="mt-6 grid min-w-0 gap-4 lg:mt-8 lg:grid-cols-2 lg:gap-5">
          <div className="glass min-w-0 rounded-xl p-4 sm:p-6">
            <h2 className="font-rajdhani text-2xl font-bold uppercase text-white sm:text-3xl">How a Result Becomes Ranking</h2>
            <div className="mt-4 space-y-2.5 text-sm leading-6 text-slate-300 sm:mt-5 sm:text-base"><p><b className="text-gold">1.</b> TNFFM Collaborator creates or approves the event.</p><p><b className="text-gold">2.</b> The event becomes an official TNFFM ranking event.</p><p><b className="text-gold">3.</b> Final standings are verified.</p><p><b className="text-gold">4.</b> TNFFM awards points from the fixed table above.</p><p><b className="text-gold">5.</b> The verified points are added to the team's official ranking record.</p></div>
          </div>
          <div className="glass min-w-0 rounded-xl p-4 sm:p-6">
            <h2 className="font-rajdhani text-2xl font-bold uppercase text-white sm:text-3xl">Registration Is Separate</h2>
            <p className="mt-3 break-words text-sm leading-6 text-slate-300 sm:mt-4 sm:text-base sm:leading-7">Registered teams appear in the Tamil Community Teams Showcase. Registration alone gives no ranking points. Teams become ranked only after verified results from eligible TNFFM Collaborator events.</p>
          </div>
        </div>

        <div className="mt-6 glass min-w-0 rounded-xl p-4 sm:p-6"><h2 className="font-rajdhani text-2xl font-bold uppercase text-white sm:text-3xl">Name Transfer Rule</h2><p className="mt-3 break-words text-sm leading-6 text-slate-300 sm:mt-4 sm:text-base sm:leading-7">Team names must remain consistent. Significant rebrands must be submitted for approval so official ranking history stays attached to the correct team identity.</p></div>
      </section>
    </main>
  );
}
