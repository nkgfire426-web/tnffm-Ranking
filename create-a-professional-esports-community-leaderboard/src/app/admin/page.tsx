import { Header } from "@/components/Header";
import { AdminDashboardWithSearch } from "@/components/AdminDashboardWithSearch";
import { getTrackedEvents } from "@/lib/events";
import { getRankedTeams } from "@/lib/google-sheets";
import { getCollaborators } from "@/lib/collaborators";
import Link from "next/link";

export const metadata = {
  title: "Admin Dashboard | TNFFM Community Rankings",
  description: "Protected team management dashboard for TNFFM Community Rankings."
};

// This page reads live Google Sheets data and must never be statically generated.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  const teams = await getRankedTeams();
  const events = await getTrackedEvents();
  const collaborators = await getCollaborators();

  return (
    <main>
      <Header />
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <Link href="/admin/news" className="inline-flex items-center rounded-lg border border-gold/30 bg-black/30 px-4 py-3 text-sm font-bold text-gold transition hover:bg-gold hover:text-black">
          Tournament News & Updates
        </Link>
      </div>
      <AdminDashboardWithSearch initialTeams={teams} initialEvents={events} initialCollaborators={collaborators} />
    </main>
  );
}
