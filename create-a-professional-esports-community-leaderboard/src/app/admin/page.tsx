import { Header } from "@/components/Header";
import { AdminDashboard } from "@/components/AdminDashboard";
import { getTrackedEvents } from "@/lib/events";
import { getRankedTeams } from "@/lib/google-sheets";
import { getCollaborators } from "@/lib/collaborators";

export const metadata = {
  title: "Admin Dashboard | TNFFM Community Rankings",
  description: "Protected team management dashboard for TNFFM Community Rankings."
};

export default async function AdminPage() {
  const teams = await getRankedTeams();
  const events = await getTrackedEvents();
  const collaborators = await getCollaborators();

  return (
    <main>
      <Header />
      <AdminDashboard initialTeams={teams} initialEvents={events} initialCollaborators={collaborators} />
    </main>
  );
}
