import Link from "next/link";
import { Header } from "@/components/Header";

export default function NotFound() {
  return (
    <main>
      <Header />
      <section className="mx-auto grid min-h-[70vh] max-w-2xl place-items-center px-4 text-center">
        <div className="glass rounded-lg p-8">
          <p className="font-rajdhani text-sm font-bold uppercase tracking-[0.25em] text-gold">404</p>
          <h1 className="mt-2 font-rajdhani text-5xl font-bold uppercase text-white">Team Not Found</h1>
          <p className="mt-3 text-slate-400">This profile is not available in the current TNFFM Community Rankings sheet.</p>
          <Link href="/" className="mt-6 inline-flex rounded-lg bg-gold px-5 py-3 font-bold text-black">
            Back to rankings
          </Link>
        </div>
      </section>
    </main>
  );
}
