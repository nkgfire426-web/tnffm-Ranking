import { Header } from "@/components/Header";
import { TeamDetailsClient } from "@/components/TeamDetailsClient";
import { getPublicRegisteredTeams } from "@/lib/public-sheet";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeamDetailsPage() {
  let teams = [];
  let loadError = "";
  try {
    teams = await getPublicRegisteredTeams();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unable to load team details from Google Sheets.";
  }

  return (
    <main>
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="font-rajdhani text-4xl font-bold uppercase text-white">Team Profiles</h1>
        <p className="mt-2 text-sm text-slate-400">Live registered team details, logos, banners, descriptions and rosters from Google Sheets.</p>
        {loadError ? (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-200">{loadError}</div>
        ) : (
          <TeamDetailsClient teams={teams} />
        )}
      </div>
    </main>
  );
}
