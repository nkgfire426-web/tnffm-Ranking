"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Instagram, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#030304] text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <Link href="/" className="inline-flex items-center gap-3 rounded-xl transition hover:opacity-90">
              <span className="grid h-11 w-11 place-items-center rounded-xl border border-gold/30 bg-black p-1.5"><Image src="/brand/tnffm-logo.png" alt="TNFFM" width={44} height={44} className="h-full w-full object-contain" /></span>
              <span><span className="block font-rajdhani text-xl font-black text-white">TNFFM</span><span className="block text-[9px] font-bold uppercase tracking-[.24em] text-gold">Community Rankings</span></span>
            </Link>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500">A community-first competitive platform for tracking verified Free Fire MAX esports performance, tournament results and team achievements.</p>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <SocialLink href="https://www.instagram.com/tn_ffm_esports?igsh=MTQ0cmp4Y21oemtuag==" label="Instagram" icon={<Instagram className="h-4 w-4" />} />
            <SocialLink href="https://whatsapp.com/channel/0029Vb6cIDCJENy6ELAAF128" label="WhatsApp" icon={<Phone className="h-4 w-4" />} />
            <Link href="/ranking" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.025] px-4 py-3 text-xs font-bold text-slate-300 transition hover:border-gold/25 hover:text-gold">Rankings <ArrowUpRight className="h-3.5 w-3.5" /></Link>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-2 border-t border-white/[.06] pt-5 text-[10px] font-bold uppercase tracking-[.16em] text-slate-600 sm:flex-row sm:items-center sm:justify-between"><span>TNFFM Community Rankings</span><span>Building a healthy competitive community</span></div>
      </div>
    </footer>
  );
}

function SocialLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return <Link href={href} aria-label={label} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.025] px-4 py-3 text-xs font-bold text-slate-300 transition hover:border-gold/25 hover:bg-gold/5 hover:text-gold" target="_blank" rel="noopener noreferrer">{icon}<span>{label}</span></Link>;
}
