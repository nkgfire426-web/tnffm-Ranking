import { Header } from "@/components/Header";
import { TeamDetailsClient } from "@/components/TeamDetailsClient";
import { getRankedTeams } from "@/lib/google-sheets";

// Team details are backed by live Google Sheets data; keep this route dynamic.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeamDetailsPage() {
  const teams = await getRankedTeams();

  return (
    <main>
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="font-rajdhani text-4xl font-bold uppercase text-white">Team Details</h1>
        <p className="mt-2 text-sm text-slate-400">Search or select a team to view a full profile and history.</p>
        <TeamDetailsClient teams={teams} />
      </div>
    </main>
  );
}
