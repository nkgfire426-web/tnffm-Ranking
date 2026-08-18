import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getCollaborators } from "@/lib/collaborators";

export const metadata = {
  title: "Collaborators | TNFFM",
  description: "Sponsors and partners supporting TNFFM community events"
};

// Collaborators are read from live Google Sheets data.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CollaboratorsPage() {
  const collaborators = await getCollaborators();

  return (
    <main>
      <Header />
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="mb-4 text-3xl font-bold text-white">Collaborators</h1>
        <p className="mb-8 text-sm text-slate-400">Our sponsors, partners, and community collaborators.</p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collaborators.map((c: any, i: number) => (
            <a key={i} href={c.url || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-lg bg-black/40 p-4 transition hover:bg-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.logoUrl} alt={c.name} className="h-16 w-16 rounded object-cover" />
              <div>
                <div className="font-semibold text-white">{c.name}</div>
                <div className="text-xs text-slate-400">{c.role}</div>
              </div>
            </a>
          ))}
          {collaborators.length === 0 && <div className="text-sm text-slate-400">No collaborators configured yet.</div>}
        </div>
      </section>
      <Footer />
    </main>
  );
}
