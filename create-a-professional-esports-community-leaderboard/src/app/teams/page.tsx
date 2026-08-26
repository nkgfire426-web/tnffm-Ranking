import Link from "next/link";
import { Header } from "@/components/Header";
import { TeamLogo } from "@/components/TeamLogo";
import { getPublicRegisteredTeams } from "@/lib/public-sheet";
import { slugify } from "@/lib/rankings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CommunityTeamsPage() {
  let teams = [];
  let loadError = "";
  try {
    teams = await getPublicRegisteredTeams();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unable to load registered teams from Google Sheets.";
  }

  return (
    <main className="min-h-screen bg-[#050507] text-white">
      <Header />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-gold/20 bg-gradient-to-br from-[#17130b] via-[#0b0b0c] to-black p-6 shadow-2xl sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-gold">TNFFM Tamil Community</p>
          <h1 className="mt-2 font-rajdhani text-4xl font-black uppercase sm:text-6xl">Registered Teams Showcase</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
            Live registered team profiles loaded directly from the official Google Sheet.
          </p>
          <div className="mt-5">
            <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-gold">{teams.length} Registered Teams</span>
          </div>
        </div>

        {loadError ? (
          <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-200">
            <p className="font-bold">Unable to load live Google Sheet data.</p>
            <p className="mt-2 text-red-200/70">{loadError}</p>
          </div>
        ) : teams.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-10 text-center text-slate-500">No registered teams found in Google Sheets.</div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {teams.map((team) => {
              const slug = String((team as any).slug || slugify(team.teamName));
              return (
                <Link key={String((team as any).teamId || team.teamName) + slug} href={`/team-details?team=${encodeURIComponent(slug)}`} className="group rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:-translate-y-1 hover:border-gold/40 hover:bg-gold/[0.04]">
                  <div className="flex items-center gap-4">
                    <TeamLogo src={team.logoUrl} name={team.teamName} size={64} />
                    <div className="min-w-0">
                      <h2 className="truncate font-rajdhani text-2xl font-bold uppercase text-white group-hover:text-gold">{team.teamName}</h2>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{team.status || "Active"} • Registered Team</p>
                    </div>
                  </div>
                  {team.bannerUrl ? <div className="mt-4 overflow-hidden rounded-lg border border-white/10"><img src={team.bannerUrl} alt={`${team.teamName} banner`} className="h-24 w-full object-cover" loading="lazy" /></div> : null}
                  <div className="mt-5 border-t border-white/10 pt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold uppercase tracking-wider text-slate-500">Players</span>
                      <span className="font-bold text-slate-400">{Number(team.players || 0)}</span>
                    </div>
                    {team.description ? <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-400">{team.description}</p> : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
