"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Edit3, Eye, EyeOff, Lock, Plus, Save, Trash2, X } from "lucide-react";
import { normalizeImageUrl } from "@/components/TeamLogo";

type NewsItem = { id: string; title: string; description: string; date: string; type: string; status: string; imageUrl: string; link: string };

const emptyNews = (): NewsItem => ({ id: `NEWS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title: "", description: "", date: new Date().toISOString().slice(0, 10), type: "Tournament", status: "Published", imageUrl: "", link: "" });

export default function AdminNewsPage() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!password) return;
    setBusy(true); setStatus("Loading Tournament News from Google Sheets...");
    try {
      const response = await fetch("/api/admin/sheet", { cache: "no-store", headers: { "x-admin-password": password, Accept: "application/json" } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) { setStatus(result.message || "Unable to load Google Sheets."); return; }
      setItems(Array.isArray(result.news) ? result.news.map((item: Partial<NewsItem>, index: number) => ({ id: item.id || `NEWS-${Date.now()}-${index}`, title: item.title || "", description: item.description || "", date: item.date || "", type: item.type || "Update", status: item.status || "Draft", imageUrl: item.imageUrl || "", link: item.link || "" })) : []);
      setStatus("Google Sheets synced successfully.");
    } catch { setStatus("Unable to connect to the server."); } finally { setBusy(false); }
  }

  async function login() {
    setBusy(true); setStatus("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      if (!response.ok) { setStatus("Invalid admin password."); return; }
      setUnlocked(true); setStatus("Admin unlocked. Loading news...");
    } catch { setStatus("Login failed — check server connection."); } finally { setBusy(false); }
  }

  useEffect(() => { if (unlocked) void load(); }, [unlocked]);

  function addNews() { setEditing(emptyNews()); }
  function saveEditor() {
    if (!editing?.title.trim() || !editing.description.trim()) { setStatus("Title and description are required."); return; }
    setItems(current => current.some(item => item.id === editing.id) ? current.map(item => item.id === editing.id ? editing : item) : [editing, ...current]);
    setEditing(null); setStatus("News editor changes are ready. Click Save to Google Sheet to publish the changes.");
  }
  function removeNews(id: string) { if (confirm("Delete this tournament news item? Click Save to Google Sheet afterwards to permanently save the deletion.")) { setItems(current => current.filter(item => item.id !== id)); setStatus("News removed from the editor. Click Save to Google Sheet to permanently save the deletion."); } }
  function toggleStatus(id: string) { setItems(current => current.map(item => item.id === id ? { ...item, status: item.status.toLowerCase() === "published" ? "Draft" : "Published" } : item)); setStatus("Publication status changed locally. Click Save to Google Sheet to save it."); }

  async function saveToSheet() {
    if (!password) { setStatus("Admin password is missing. Unlock the editor again."); return; }
    if (!Array.isArray(items)) { setStatus("News data is invalid. Reload the editor."); return; }
    setBusy(true); setStatus("Saving Tournament News to Google Sheets and verifying the result...");
    try {
      const response = await fetch("/api/admin/save", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" }, body: JSON.stringify({ password, news: items }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false || result.verified === false || result.readBackVerified === false) { setStatus(result.message || "Google Sheet save failed. Nothing was reported as successfully saved."); return; }
      setStatus("✅ Tournament News saved and verified in Google Sheets. Refreshing live data...");
      await load();
    } catch { setStatus("Save failed — server unreachable. Your editor changes are still on this page."); } finally { setBusy(false); }
  }

  if (!unlocked) return (
    <main className="mx-auto grid min-h-[75vh] max-w-md place-items-center px-4 py-10">
      <div className="glass w-full rounded-2xl p-7">
        <Lock className="mb-4 h-8 w-8 text-gold" />
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">TNFFM Admin</p>
        <h1 className="mt-1 font-rajdhani text-4xl font-bold uppercase text-white">Tournament News</h1>
        <p className="mt-2 text-sm text-slate-400">Manage the news and updates displayed on the homepage.</p>
        <input value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void login(); }} type="password" placeholder="Admin password" className="mt-6 w-full rounded-lg border border-white/10 bg-black/45 px-4 py-3 text-white outline-none focus:border-gold/60" />
        {status && <p className="mt-3 text-sm text-red-300">{status}</p>}
        <button disabled={busy || !password} onClick={() => void login()} className="mt-4 w-full rounded-lg bg-gold px-4 py-3 font-bold text-black disabled:opacity-50">{busy ? "Unlocking..." : "Unlock"}</button>
      </div>
    </main>
  );

  return (
    <main className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0"><Link href="/admin" className="mb-3 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-gold hover:text-white"><ArrowLeft className="h-4 w-4" />Back to Admin Dashboard</Link><p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">Homepage Content</p><h1 className="font-rajdhani text-3xl font-bold uppercase text-white sm:text-4xl">Tournament News &amp; Updates</h1><p className="mt-2 text-sm text-slate-400">Changes are stored in the <b className="text-slate-200">TournamentNews</b> Google Sheet.</p></div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto"><button disabled={busy} onClick={addNews} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 font-bold text-black disabled:opacity-50"><Plus className="h-4 w-4" />Add News</button><button disabled={busy || items.length === 0} onClick={() => void saveToSheet()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" />{busy ? "Saving..." : "Save to Google Sheet"}</button></div>
      </div>
      {status && <div className="mb-5 rounded-lg border border-gold/25 bg-gold/10 px-4 py-3 text-sm font-semibold text-gold break-words">{status}</div>}
      <div className="space-y-4">
        {items.length === 0 && <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-10 text-center text-slate-500">No tournament news yet. Click Add News.</div>}
        {items.map(item => (
          <article key={item.id} className="rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                {item.imageUrl && <div className="mb-4"><img src={normalizeImageUrl(item.imageUrl)} alt={item.title || "Tournament news"} className="h-40 w-full max-w-xl rounded-xl border border-white/10 object-cover" onError={(e) => { e.currentTarget.style.opacity = "0.35"; }} /><p className="mt-1 text-xs text-slate-500">Preview only — image URL is stored in Google Sheets.</p></div>}
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider"><span className="rounded-full border border-gold/30 px-2 py-1 text-gold">{item.type || "Update"}</span><span className={`rounded-full border px-2 py-1 ${item.status.toLowerCase() === "published" ? "border-emerald-400/30 text-emerald-300" : "border-slate-500/30 text-slate-400"}`}>{item.status || "Draft"}</span><span className="text-slate-500">{item.date || "No date"}</span></div><h2 className="mt-3 break-words text-xl font-bold text-white">{item.title}</h2><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-400">{item.description}</p>{item.link && <a href={item.link} target="_blank" rel="noreferrer" className="mt-3 inline-block break-all text-sm font-bold text-gold hover:text-white">Open linked page →</a>}
              </div>
              <div className="grid w-full grid-cols-3 gap-2 lg:w-auto lg:flex"><button onClick={() => setEditing(item)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/10 px-2 py-2 text-xs font-bold text-slate-200 hover:border-gold/30 hover:text-gold sm:px-3 sm:text-sm"><Edit3 className="h-4 w-4" />Edit</button><button onClick={() => toggleStatus(item.id)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/10 px-2 py-2 text-xs font-bold text-slate-200 hover:border-gold/30 hover:text-gold sm:px-3 sm:text-sm">{item.status.toLowerCase() === "published" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{item.status.toLowerCase() === "published" ? "Unpublish" : "Publish"}</button><button onClick={() => removeNews(item.id)} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-400/20 px-3 py-2 text-red-300 hover:bg-red-400/10"><Trash2 className="h-4 w-4" /></button></div>
            </div>
          </article>
        ))}
      </div>

      {editing && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-3 backdrop-blur-sm sm:grid sm:place-items-center sm:p-4"><div className="my-2 w-full max-w-2xl rounded-2xl border border-gold/20 bg-[#09090b] p-4 shadow-2xl sm:my-0 sm:p-6"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">News Editor</p><h2 className="font-rajdhani text-2xl font-bold uppercase text-white sm:text-3xl">{items.some(item => item.id === editing.id) ? "Edit News" : "Add News"}</h2></div><button onClick={() => setEditing(null)} className="shrink-0 rounded-lg p-2 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button></div><div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm text-slate-300 md:col-span-2">Title<input autoFocus value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-gold/50" placeholder="Tournament announcement" /></label><label className="text-sm text-slate-300">Date<input type="date" value={editing.date} onChange={e => setEditing({ ...editing, date: e.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-gold/50" /></label><label className="text-sm text-slate-300">Type<select value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-gold/50"><option>Tournament</option><option>Announcement</option><option>Update</option><option>Result</option></select></label><label className="text-sm text-slate-300 md:col-span-2">Description<textarea rows={5} value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-gold/50" placeholder="Write the update shown on the homepage..." /></label><label className="text-sm text-slate-300 md:col-span-2">Image URL<input value={editing.imageUrl} onChange={e => setEditing({ ...editing, imageUrl: e.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-gold/50" placeholder="https://.../tournament-poster.jpg or Google Drive sharing link" /><span className="mt-1 block text-xs text-slate-500">Google Drive sharing links are supported. Use Share → Anyone with the link → Viewer.</span></label><label className="text-sm text-slate-300 md:col-span-2">Optional Link<input value={editing.link} onChange={e => setEditing({ ...editing, link: e.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-gold/50" placeholder="https://..." /></label></div><div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:justify-end"><button onClick={() => setEditing(null)} className="min-h-11 rounded-lg border border-white/10 px-4 py-3 font-bold text-slate-300">Cancel</button><button onClick={saveEditor} className="min-h-11 rounded-lg bg-gold px-5 py-3 font-bold text-black">Save News</button></div></div></div>}
    </main>
  );
}
