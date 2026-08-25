import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { TeamProfile } from "@/components/TeamProfile";
import { getUnifiedTeamBySlug } from "@/lib/site-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const team = await getUnifiedTeamBySlug(slug);
  return {
    title: team ? `${team.teamName} | TNFFM Community Rankings` : "Team Profile | TNFFM Community Rankings",
    description: team ? `${team.teamName} profile, current registered-team details, competitive history, and TNFFM community points.` : "TNFFM team profile."
  };
}

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const team = await getUnifiedTeamBySlug(slug);
  if (!team) notFound();

  return (
    <main>
      <Header />
      <TeamProfile team={team} />
    </main>
  );
}
