import Link from "next/link";
import { ArrowLeft, Newspaper, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { NewsCard } from "@/components/NewsCard";
import { getTournamentNews } from "@/lib/google-sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewsPage() {
  const allNews = await getTournamentNews();
  const news = allNews
    .filter(item => ["published", "active"].includes(String(item.status || "").trim().toLowerCase()))
    .filter(item => String(item.title || "").trim())
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  return (
    <main className="dashboard-inspired-site min-h-screen">
      <Header />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/" className="mb-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 transition hover:border-gold/40 hover:text-gold">
              <ArrowLeft className="h-4 w-4" /> Back to Rankings
            </Link>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-gold/30 bg-gold/10 text-gold"><Newspaper className="h-5 w-5" /></span>
              <div><p className="text-xs font-black uppercase tracking-[0.25em] text-gold">TNFFM Community</p><h1 className="font-rajdhani text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">News & Updates</h1></div>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">Tournament announcements, results, community updates and the latest official TNFFM news in one place.</p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400"><Sparkles className="h-4 w-4 text-gold" /> {news.length} {news.length === 1 ? "Update" : "Updates"}</div>
        </div>

        {news.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/35 px-6 py-16 text-center shadow-glow">
            <Newspaper className="mx-auto h-10 w-10 text-slate-600" />
            <h2 className="mt-4 font-rajdhani text-2xl font-bold text-white">No news published yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">New tournament news and community updates will appear here automatically when published.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {news.map((item, index) => <NewsCard key={item.id || `${item.title}-${item.date || index}`} item={item} index={index} />)}
          </div>
        )}
      </section>
    </main>
  );
}
