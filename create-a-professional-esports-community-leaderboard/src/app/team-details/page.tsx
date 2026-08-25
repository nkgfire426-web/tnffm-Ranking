import { Header } from "@/components/Header";
import { TeamDetailsClient } from "@/components/TeamDetailsClient";
import { getUnifiedTeamData } from "@/lib/site-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeamDetailsPage() {
  const teams = await getUnifiedTeamData();

  return (
    <main>
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="font-rajdhani text-4xl font-bold uppercase text-white">Team Profiles</h1>
        <p className="mt-2 text-sm text-slate-400">Live team profile details from Google Sheets, with official ranking information when a team is ranked.</p>
        <TeamDetailsClient teams={teams} />
      </div>
    </main>
  );
}
