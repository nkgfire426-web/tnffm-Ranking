import { Header } from "@/components/Header";
import { PublicResultSubmissionForm } from "@/components/PublicResultSubmissionForm";
import { getPublicRegisteredTeams } from "@/lib/public-sheet";
import type { RawTeam } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SubmitResultsPage() {
  let teams: RawTeam[] = [];
  try {
    teams = await getPublicRegisteredTeams();
  } catch {
    teams = [];
  }

  return (
    <main className="min-h-screen bg-[#050507] text-white">
      <Header />
      <section className="relative overflow-hidden border-b border-gold/15">
        <div className="absolute inset-0 bg-[url('/brand/tnffm-banner.jpg')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050507]/98 via-[#050507]/92 to-[#050507]/70" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <p className="font-rajdhani text-xs font-black uppercase tracking-[.28em] text-gold">TNFFM • Official Submission</p>
          <h1 className="mt-3 max-w-4xl font-rajdhani text-4xl font-black uppercase leading-[.9] sm:text-6xl">
            Submit <span className="gold-text">Tournament Results</span>
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
            Registered teams can submit their official completed tournament Finals / Grand Finals result for TNFFM assessment. No team login is required.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <PublicResultSubmissionForm teams={teams} />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
            <h2 className="font-rajdhani text-xl font-bold uppercase">What happens next?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Your submission is stored as Pending. TNFFM reviews the final result and supporting proof before it is considered for ranking.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
            <h2 className="font-rajdhani text-xl font-bold uppercase">Need a registered team?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Only teams already present in the official community team list can submit ranking results.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
