import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getCollaborators } from "@/lib/collaborators";

export const metadata = {
  title: "Collaborators | TNFFM",
  description: "Sponsors and partners supporting TNFFM community events"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getLogoUrl(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";

  const driveFile = raw.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  const driveOpen = raw.match(/[?&]id=([^&]+)/i);
  const driveId = driveFile?.[1] || (raw.includes("drive.google.com") ? driveOpen?.[1] : undefined);

  if (driveId) return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w512`;
  return raw;
}

function externalUrl(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

export default async function CollaboratorsPage() {
  const collaborators = await getCollaborators();

  return (
    <main className="min-h-screen bg-[#050507] text-white">
      <Header />
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">TNFFM Community</p>
          <h1 className="mt-2 font-rajdhani text-4xl font-black uppercase sm:text-6xl">Our Collaborators</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Sponsors, partners, and community collaborators supporting TNFFM events and esports growth.
          </p>
        </div>

        {collaborators.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.025] p-10 text-center text-sm text-slate-400">
            No active collaborators are currently configured.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {collaborators.map((c) => {
              const logoUrl = getLogoUrl(c.logoUrl);
              const website = externalUrl(c.url);
              const instagram = externalUrl(c.instagram);
              const primaryUrl = website || instagram;

              const card = (
                <article className="h-full rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:-translate-y-1 hover:border-gold/30 hover:bg-white/[0.04]">
                  <div className="flex items-start gap-4">
                    <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-black/40 p-2">
                      {logoUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={logoUrl} alt={`${c.name} logo`} className="h-full w-full object-contain" loading="lazy" />
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Logo</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-rajdhani text-2xl font-bold uppercase text-white">{c.name}</h2>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gold">{c.role}</p>
                      {c.status && <span className="mt-2 inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">{c.status}</span>}
                    </div>
                  </div>

                  <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm">
                    {c.contact && <p className="truncate text-slate-300"><span className="text-slate-500">Contact:</span> {c.contact}</p>}
                    {website && <a href={website} target="_blank" rel="noopener noreferrer" className="block truncate text-gold hover:underline">Website ↗</a>}
                    {instagram && <a href={instagram} target="_blank" rel="noopener noreferrer" className="block truncate text-slate-300 hover:text-gold">Instagram ↗</a>}
                    {!c.contact && !website && !instagram && <p className="text-slate-500">TNFFM community collaborator</p>}
                  </div>
                </article>
              );

              return primaryUrl ? (
                <a key={c.collaboratorId || `${c.name}-${c.role}`} href={primaryUrl} target="_blank" rel="noopener noreferrer" className="block h-full">
                  {card}
                </a>
              ) : (
                <div key={c.collaboratorId || `${c.name}-${c.role}`} className="h-full">{card}</div>
              );
            })}
          </div>
        )}
      </section>
      <Footer />
    </main>
  );
}
