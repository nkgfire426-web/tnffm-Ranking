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

  // Accept normal Google Drive share/view links as well as direct image URLs.
  const driveFile = raw.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  const driveOpen = raw.match(/[?&]id=([^&]+)/i);
  const driveId = driveFile?.[1] || (raw.includes("drive.google.com") ? driveOpen?.[1] : undefined);

  if (driveId) {
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w512`;
  }

  // Also support Drive URLs such as /uc?id=FILE_ID or /thumbnail?id=FILE_ID.
  if (/drive\.google\.com/i.test(raw) && /[?&]id=/.test(raw)) {
    return raw;
  }

  return raw;
}

export default async function CollaboratorsPage() {
  const collaborators = await getCollaborators();

  return (
    <main>
      <Header />
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="mb-4 text-3xl font-bold text-white">Collaborators</h1>
        <p className="mb-8 text-sm text-slate-400">Our sponsors, partners, and community collaborators.</p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collaborators.map((c: any, i: number) => {
            const logoUrl = getLogoUrl(c.logoUrl || c.logo || c.logoURL);
            return (
              <a key={i} href={c.url || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-lg bg-black/40 p-4 transition hover:bg-white/5">
                {logoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={logoUrl}
                    alt={c.name || "Collaborator logo"}
                    className="h-16 w-16 rounded object-contain bg-black/30"
                  />
                ) : (
                  <div className="grid h-16 w-16 place-items-center rounded bg-black/30 text-xs text-slate-500">LOGO</div>
                )}
                <div>
                  <div className="font-semibold text-white">{c.name}</div>
                  <div className="text-xs text-slate-400">{c.role}</div>
                </div>
              </a>
            );
          })}
          {collaborators.length === 0 && <div className="text-sm text-slate-400">No collaborators configured yet.</div>}
        </div>
      </section>
      <Footer />
    </main>
  );
}
