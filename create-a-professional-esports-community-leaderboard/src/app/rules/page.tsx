import { Header } from "@/components/Header";

const eventRules = [
  "Minimum prize pool: Rs.1000 or above and only full map events.",
  "Wildcard slots are not permitted.",
  "At least 24 participating teams are required.",
  "Tournament or league must be officially organized.",
  "Final standings must be publicly available and verifiable.",
  "Only finale or grand finals results are used for ranking.",
  "Events involving cheating, hacking, or result manipulation will be excluded.",
  "Only fully completed events will be counted.",
  "TNFFM rankings are not limited to Tamil Nadu events; eligible grand finals results may be submitted from anywhere.",
  "TNFFM reserves the right to approve or reject any submitted event."
];

const teamRules = [
  "Only Tamil Nadu teams are eligible for this leaderboard.",
  "Teams must maintain at least 3 core members to retain accumulated Community Score.",
  "Team names must remain consistent; major rebrands need approval.",
  "Teams inactive for 2 consecutive months are marked Inactive and temporarily hidden.",
  "Inactive teams return automatically once they participate in an eligible event."
];

const penalties = [
  "Teams using unauthorized software or unsportsmanlike conduct lose points for that event.",
  "Repeat offenses may lead to permanent ban from the Season 2026 Leaderboard.",
  "Banned teams are marked as Banned.",
  "The same fair-play rules apply to event organizers."
];

export const metadata = {
  title: "Rules and Regulations | TNFFM Community Rankings",
  description: "Official TNFFM event eligibility, team eligibility, and penalty rules."
};

export default function RulesPage() {
  return (
    <main>
      <Header />
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="font-rajdhani text-sm font-bold uppercase tracking-[0.25em] text-gold">Season 2026</p>
        <h1 className="font-rajdhani text-5xl font-bold uppercase text-white">Rules and Regulations</h1>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <RuleCard title="Event Eligibility" rules={eventRules} />
          <RuleCard title="Team Eligibility" rules={teamRules} />
          <RuleCard title="Disqualification and Penalties" rules={penalties} />
        </div>
      </section>
    </main>
  );
}

function RuleCard({ title, rules }: { title: string; rules: string[] }) {
  return (
    <div className="glass rounded-lg p-6">
      <h2 className="font-rajdhani text-3xl font-bold uppercase text-white">{title}</h2>
      <div className="mt-5 space-y-3">
        {rules.map((rule) => (
          <div key={rule} className="rounded-lg border border-white/10 bg-black/30 p-4 text-sm leading-6 text-slate-300">
            {rule}
          </div>
        ))}
      </div>
    </div>
  );
}
