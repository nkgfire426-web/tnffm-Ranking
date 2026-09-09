import { Header } from "@/components/Header";
import { TeamPosterCreator } from "@/components/TeamPosterCreator";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function PosterStudioPage() {
  return <main><Header /><div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">TNFFM Community Tools</p><h1 className="mt-2 font-rajdhani text-4xl font-black uppercase text-white sm:text-5xl">Team Poster Studio</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Create your own professional TNFFM team poster. Enter your team identity, guild, location, achievements and player information, then download a 1080 × 1350 PNG.</p><TeamPosterCreator /></div></main>;
}
