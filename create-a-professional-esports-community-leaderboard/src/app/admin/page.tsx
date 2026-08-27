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
    <main className="min-h-screen overflow-x-hidden bg-black">
      <Header />

      <div className="relative isolate overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.12),transparent_58%)]" />

        <div className="mx-auto w-full max-w-7xl px-3 pt-4 sm:px-6 sm:pt-6 lg:px-8">
          <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-3 shadow-2xl shadow-black/30 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gold">TNFFM Administration</p>
              <p className="mt-1 text-sm text-slate-400">Manage community data from one clean control center.</p>
            </div>
            <Link
              href="/admin/news"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-gold/30 bg-gold/[0.06] px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-gold transition hover:border-gold hover:bg-gold hover:text-black sm:text-sm"
            >
              Tournament News &amp; Updates
            </Link>
          </div>

          <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-black/20 shadow-xl shadow-black/20 sm:mt-4 sm:overflow-visible">
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
      </div>
    </main>
  );
}
