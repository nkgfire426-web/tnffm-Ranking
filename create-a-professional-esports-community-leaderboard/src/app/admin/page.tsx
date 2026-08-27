import { Header } from "@/components/Header";
import { AdminDashboardStable } from "@/components/AdminDashboardStable";
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
    <main className="min-h-screen overflow-x-hidden">
      <Header />
      <div className="mx-auto w-full max-w-7xl px-3 pt-3 sm:px-6 sm:pt-4 lg:px-8">
        <Link
          href="/admin/news"
          className="flex min-h-11 w-full items-center justify-center rounded-xl border border-gold/30 bg-black/30 px-4 py-3 text-center text-xs font-bold text-gold transition hover:bg-gold hover:text-black sm:inline-flex sm:w-auto sm:text-sm"
        >
          Tournament News &amp; Updates
        </Link>
        <div className="mt-3 overflow-x-auto rounded-xl sm:overflow-visible">
          <AdminTeamRemoval initialTeams={teams} />
        </div>
      </div>
      <div className="w-full min-w-0 overflow-x-hidden">
        <AdminDashboardStable
          initialTeams={teams}
          initialEvents={events}
          initialCollaborators={collaborators}
        />
      </div>
    </main>
  );
}
