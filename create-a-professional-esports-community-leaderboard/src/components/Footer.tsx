"use client";

import Link from "next/link";
import { Instagram, Phone } from "lucide-react";

export function Footer() {
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
