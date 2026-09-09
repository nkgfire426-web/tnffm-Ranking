"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ImagePlus, Lock, Pencil, Plus, RefreshCw, Save, Search, Trash2, X } from "lucide-react";
import Link from "next/link";

type Achievement = {
  id: string;
  title: string;
  description: string;
  date: string;
  imageUrl: string;
  link: string;
  type: string;
  status: string;
};

type ApiNews = Partial<Achievement> & Record<string, any>;

const blank = (): Achievement => ({ id: `ACH-${Date.now()}`, title: "", description: "", date: "", imageUrl: "", link: "", type: "Achievement", status: "Published" });

function normalize(item: ApiNews, index: number): Achievement {
  return {
    id: String(item.id ?? item.ID ?? `ACH-${index + 1}`),
    title: String(item.title ?? item.Title ?? "").trim(),
    description: String(item.description ?? item.Description ?? "").trim(),
    date: String(item.date ?? item.Date ?? "").trim(),
    imageUrl: String(item.imageUrl ?? item.ImageURL ?? item["Image URL"] ?? "").trim(),
    link: String(item.link ?? item.Link ?? "").trim(),
    type: String(item.type ?? item.Type ?? "").trim(),
    status: String(item.status ?? item.Status ?? "Published").trim() || "Published",
  };
}

export default function AdminAchievementShowcasePage() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [items, setItems] = useState<Achievement[]>([]);
  const [editing, setEditing] = useState<Achievement | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  async function load() {
    if (!password || loading) return;
    setLoading(true);
    setStatus("Loading independent achievement records...");
    try {
      const response = await fetch("/api/admin/sheet", { cache: "no-store", headers: { "x-admin-password": password, Accept: "application/json" } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) throw new Error(data.message || "Unable to load achievement records.");
      const news = Array.isArray(data.news) ? data.news : [];
      setItems(news.map(normalize).filter((item: Achievement) => item.type.toLowerCase() === "achievement"));
      setUnlocked(true);
      setStatus("Independent achievement records loaded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load achievement records.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => !q || `${item.title} ${item.description}`.toLowerCase().includes(q));
  }, [items, query]);

  function saveEditor() {
    if (!editing?.title.trim()) return setStatus("Achievement title is required.");
    setItems((current) => {
      const exists = current.some((item) => item.id === editing.id);
      return exists ? current.map((item) => item.id === editing.id ? editing : item) : [editing, ...current];
    });
    setEditing(null);
    setStatus("Achievement prepared. Press Save to publish the changes.");
  }

  function remove(id: string) {
    if (!window.confirm("Remove this achievement from the public showcase?")) return;
    setItems((current) => current.filter((item) => item.id !== id));
    setStatus("Achievement removed locally. Press Save to confirm the change.");
  }

  async function save() {
    setSaving(true);
    setStatus("Saving independent achievement records...");
    try {
      const response = await fetch("/api/admin/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, news: items.map((item) => ({ id: item.id, title: item.title, description: item.description, date: item.date, type: "Achievement", status: item.status, imageUrl: item.imageUrl, link: item.link })) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) throw new Error(data.message || "Achievement save failed.");
      setStatus("✓ Achievement showcase saved and verified. No ranking data was changed.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Achievement save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (!unlocked) return (
    <main className="min-h-screen bg-[#050507] px-4 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
        <div className="w-full rounded-3xl border border-gold/20 bg-white/[.025] p-7 shadow-2xl">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-gold text-black"><Lock /></div>
          <p className="mt-5 text-xs font-black uppercase tracking-[.25em] text-gold">TNFFM Administration</p>
          <h1 className="mt-2 font-rajdhani text-4xl font-black uppercase">Achievement Showcase</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">This is a completely separate content manager. You create the achievement cards here; it does not read or calculate Community Rankings.</p>
          <input autoFocus type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void load()} placeholder="Admin password" className="mt-6 min-h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold/50" />
          <button onClick={() => void load()} disabled={!password || loading} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 font-black text-black disabled:opacity-60">{loading ? <RefreshCw className="animate-spin" /> : <Lock />}{loading ? "Checking…" : "Open Showcase Manager"}</button>
          {status && <p className="mt-3 text-sm text-slate-400">{status}</p>}
          <Link href="/admin" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-gold"><ArrowLeft className="h-4 w-4" /> Back to Admin Dashboard</Link>
        </div>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#050507] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 rounded-3xl border border-gold/15 bg-white/[.025] p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[.25em] text-gold">TNFFM • Independent Content</p>
            <h1 className="mt-2 font-rajdhani text-4xl font-black uppercase sm:text-5xl">Achievement Showcase Manager</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Create, edit, publish and remove achievement cards manually. No team ranking, score, rank, events played or ranking calculation is used here.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-xs font-black uppercase text-slate-300 hover:border-gold/30 hover:text-gold"><ArrowLeft className="h-4 w-4" /> Admin</Link>
            <button onClick={() => setEditing(blank())} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gold/30 px-4 text-xs font-black uppercase text-gold hover:bg-gold/10"><Plus className="h-4 w-4" /> Add Achievement</button>
            <button onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-xs font-black uppercase text-slate-300 hover:border-gold/30 hover:text-gold"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
            <button onClick={() => void save()} disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gold px-4 text-xs font-black uppercase text-black disabled:opacity-60"><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}</button>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search achievement..." className="min-h-12 w-full rounded-xl border border-white/10 bg-black/30 pl-10 pr-4 text-white outline-none focus:border-gold/40" /></div>
          <div className="flex items-center rounded-xl border border-white/10 bg-white/[.025] px-4 text-xs font-bold text-slate-400">{filtered.length} achievements</div>
        </div>

        {status && <p className="mt-3 rounded-xl border border-white/10 bg-white/[.025] px-4 py-3 text-sm text-slate-400">{status}</p>}

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.025]">
              <div className="aspect-[16/9] bg-black/50">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><ImagePlus className="h-8 w-8 text-slate-600" /></div>}</div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-gold">Achievement</p><h2 className="mt-1 font-rajdhani text-2xl font-black uppercase leading-tight">{item.title}</h2></div><span className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase ${item.status.toLowerCase() === "hidden" ? "border-white/10 text-slate-500" : "border-gold/20 text-gold"}`}>{item.status}</span></div>
                {item.date && <p className="mt-2 text-xs text-slate-500">{item.date}</p>}
                {item.description && <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm leading-6 text-slate-400">{item.description}</p>}
                <div className="mt-4 flex gap-2"><button onClick={() => setEditing(item)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 text-xs font-black uppercase text-slate-300 hover:border-gold/30 hover:text-gold"><Pencil className="h-4 w-4" /> Edit</button><button onClick={() => remove(item.id)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-500/20 px-3 text-xs font-black uppercase text-red-400 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button></div>
              </div>
            </article>
          ))}
        </div>

        {editing && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"><div className="mx-auto mt-8 max-w-2xl rounded-3xl border border-gold/20 bg-[#09090c] p-5 shadow-2xl sm:p-7"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.2em] text-gold">Manual entry</p><h2 className="mt-1 font-rajdhani text-3xl font-black uppercase">{items.some((item) => item.id === editing.id) ? "Edit Achievement" : "Add Achievement"}</h2></div><button onClick={() => setEditing(null)} className="rounded-xl p-2 text-slate-500 hover:text-white"><X /></button></div>
          <div className="mt-6 grid gap-4">
            <label className="text-xs font-black uppercase tracking-wider text-slate-400">Achievement / Team Title<input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Example: NIGHT HAWKS TN — Winter Cup Champion" className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold/40" /></label>
            <label className="text-xs font-black uppercase tracking-wider text-slate-400">Achievement Details<textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Write exactly what you want visitors to see..." rows={6} className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-gold/40" /></label>
            <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-black uppercase tracking-wider text-slate-400">Date / Season<input value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} placeholder="September 2026" className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold/40" /></label><label className="text-xs font-black uppercase tracking-wider text-slate-400">Image / Poster URL<input value={editing.imageUrl} onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })} placeholder="https://..." className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold/40" /></label></div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-400">Status<select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })} className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold/40"><option>Published</option><option>Hidden</option></select></label>
          </div>
          <div className="mt-6 flex justify-end gap-2"><button onClick={() => setEditing(null)} className="min-h-11 rounded-xl border border-white/10 px-4 text-xs font-black uppercase text-slate-400">Cancel</button><button onClick={saveEditor} className="min-h-11 rounded-xl bg-gold px-5 text-xs font-black uppercase text-black">Save Entry</button></div>
        </div></div>}
      </div>
    </main>
  );
}
