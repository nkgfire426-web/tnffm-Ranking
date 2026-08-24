import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { TeamProfile } from "@/components/TeamProfile";
import { getRankedTeams, getRegisteredTeams } from "@/lib/google-sheets";
import { slugify } from "@/lib/rankings";

// Team profiles read live Google Sheets data, so they must be rendered dynamically.
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function findTeam(slug: string) {
  // First use the full registered-team record because it contains profile data
  // such as roster, banner, description and player details.
  const registered = await getRegisteredTeams();
  const registeredTeam = registered.find(
    (team) => slugify(team.teamName) === slug || String((team as any).slug || "") === slug
  );
  if (registeredTeam) return registeredTeam;

  // Published ranking rows can exist even when the team-registration lookup
  // does not contain the same slug. Fall back to the live published ranking
  // so clicking a team in the official leaderboard never produces a blank page.
  const ranked = await getRankedTeams();
  return ranked.find(
    (team) => slugify(team.teamName) === slug || String((team as any).slug || "") === slug
  ) || null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const team = await findTeam(slug);
  return {
    title: team ? `${team.teamName} | TNFFM Community Rankings` : "Team Profile | TNFFM Community Rankings",
    description: team ? `${team.teamName} profile, match statistics, championship history, and TNFFM community points.` : "TNFFM team profile."
  };
}

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const team = await findTeam(slug);
  if (!team) notFound();

  return (
    <main>
      <Header />
      <TeamProfile team={team} />
    </main>
  );
}
