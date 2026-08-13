"use client";

import Link from "next/link";
import { Instagram, Phone } from "lucide-react";
import { useEffect, useState } from "react";

export function Footer() {
  const [collaborators, setCollaborators] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    fetch('/api/collaborators')
      .then((r) => r.json())
      .then((data) => mounted && setCollaborators(data || []))
      .catch(() => mounted && setCollaborators([]));
    return () => { mounted = false };
  }, []);

  return (
    <footer className="border-t border-white/10 bg-black/80 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex flex-col items-center gap-2 text-sm">
            <span className="font-medium text-white">TNFFM Community Rankings</span>
            <span className="text-xs text-slate-400">Building a healthy competitive community</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <SocialLink href="https://www.instagram.com/tn_ffm_esports?igsh=MTQ0cmp4Y21oemtuag==" label="Instagram" icon={<Instagram className="h-4 w-4" />} />
            <SocialLink href="https://whatsapp.com/channel/0029Vb6cIDCJENy6ELAAF128" label="WhatsApp" icon={<Phone className="h-4 w-4" />} />
          </div>
        </div>

        {collaborators.length > 0 && (
          <div className="mt-6">
            <h4 className="mb-3 text-center text-sm font-semibold text-white">Collaborators</h4>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {collaborators.map((c, i) => (
                <a key={i} href={c.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-md bg-white/5 px-3 py-2 transition hover:bg-white/10">
                  <img src={c.logoUrl} alt={c.name} className="h-8 w-8 rounded object-cover" />
                  <div className="text-left text-xs">
                    <div className="font-semibold text-slate-100">{c.name}</div>
                    <div className="text-slate-400">{c.role}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <span className="text-sm font-semibold tracking-wider text-white">TNFFM</span>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-gold hover:text-black" target="_blank" rel="noopener noreferrer">
      {icon}
      <span className="sr-only">{label}</span>
    </Link>
  );
}
