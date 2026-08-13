import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { TeamProfile } from "@/components/TeamProfile";
import { getRankedTeams, getTeamBySlug } from "@/lib/google-sheets";

export const revalidate = 300;

export async function generateStaticParams() {
  const teams = await getRankedTeams();
  return teams.map((team) => ({ slug: team.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const team = await getTeamBySlug(slug);
  return {
    title: team ? `${team.teamName} | TNFFM Community Rankings` : "Team Profile | TNFFM Community Rankings",
    description: team ? `${team.teamName} profile, match statistics, championship history, and TNFFM community points.` : "TNFFM team profile."
  };
}

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const team = await getTeamBySlug(slug);
  if (!team) notFound();

  return (
    <main>
      <Header />
      <TeamProfile team={team} />
    </main>
  );
}
