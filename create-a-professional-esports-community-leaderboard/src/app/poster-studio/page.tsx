import { Header } from "@/components/Header";
import { PosterStudioClient } from "@/components/PosterStudioClient";
import { getPublicTeamData } from "@/lib/site-data";
import type { RankedTeam } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PosterStudioPage() {
  let teams: RankedTeam[] = [];
  try { teams = await getPublicTeamData(); } catch { teams = []; }
  return <main><Header /><div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">TNFFM Community Tools</p><h1 className="mt-2 font-rajdhani text-4xl font-black uppercase text-white">Poster Studio</h1><p className="mt-2 text-sm text-slate-400">Search your team, create an official community poster and download it as a 1080 × 1350 PNG.</p><PosterStudioClient teams={teams} /></div></main>;
}
