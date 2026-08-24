import { Header } from "@/components/Header";
import { CommunityAdminDashboard } from "@/components/CommunityAdminDashboard";
import { AdminTeamRemoval } from "@/components/AdminTeamRemoval";
import { getTrackedEvents } from "@/lib/events";
import { getRegisteredTeams } from "@/lib/google-sheets";
import { getCollaborators } from "@/lib/collaborators";
import Link from "next/link";

export const metadata = {
  title: "Admin Dashboard | TNFFM Community",
  description: "Protected TNFFM community administration dashboard."
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  const teams = await getRegisteredTeams();
  const events = await getTrackedEvents();
  const collaborators = await getCollaborators();

  return (
    <main>
      <Header />
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <Link href="/admin/news" className="inline-flex min-h-10 items-center rounded-lg border border-gold/30 bg-black/30 px-3 py-2 text-xs font-bold text-gold transition hover:bg-gold hover:text-black sm:px-4 sm:py-3 sm:text-sm">
          Tournament News & Updates
        </Link>
        <AdminTeamRemoval initialTeams={teams} />
      </div>
      <CommunityAdminDashboard initialTeams={teams} initialEvents={events} initialCollaborators={collaborators} />
    </main>
  );
}
