import { Header } from "@/components/Header";
import { TeamDetailsClient } from "@/components/TeamDetailsClient";
import { getRegisteredTeams } from "@/lib/google-sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeamDetailsPage() {
  const teams = await getRegisteredTeams();

  return (
    <main>
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="font-rajdhani text-4xl font-bold uppercase text-white">Team Profiles</h1>
        <p className="mt-2 text-sm text-slate-400">Browse registered Tamil Community teams and their profile information.</p>
        <TeamDetailsClient teams={teams} />
      </div>
    </main>
  );
}
