export type CommunityAchievement = {
  id: string;
  title: string;
  description?: string;
  date?: string;
  status?: string;
  imageUrl?: string;
  link?: string;
  updatedAt?: string;
};

const TIMEOUT_MS = 15000;
function text(value: unknown) { return String(value ?? "").trim(); }
function url(value: unknown) {
  const valueText = text(value);
  if (!valueText) return "";
  try {
    const parsed = new URL(valueText);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    // Google Drive share links are HTML pages. Use Drive's thumbnail endpoint,
    // which is more reliable for embedding a publicly shared image in an <img>.
    if (parsed.hostname === "drive.google.com" || parsed.hostname === "www.drive.google.com") {
      const filePath = parsed.pathname.match(/\/file\/d\/([^/]+)/);
      const id = parsed.searchParams.get("id") || filePath?.[1];
      if (id && (parsed.pathname.includes("/file/d/") || parsed.pathname === "/open" || parsed.pathname === "/uc" || parsed.pathname === "/thumbnail")) {
        return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1600`;
      }
    }
    return valueText;
  } catch { return ""; }
}

export async function getCommunityAchievements(): Promise<CommunityAchievement[]> {
  const webhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim();
  if (!webhook) return [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const endpoint = new URL(webhook);
    endpoint.searchParams.set("_tnffm_achievements", `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const response = await fetch(endpoint.toString(), { method: "GET", cache: "no-store", headers: { Accept: "application/json", "Cache-Control": "no-cache, no-store, max-age=0" }, signal: controller.signal });
    if (!response.ok) throw new Error(`Google Apps Script returned HTTP ${response.status}`);
    const payload: any = await response.json();
    if (!payload || payload.ok === false || !Array.isArray(payload.achievements)) return [];
    return payload.achievements
      .map((item: any, index: number): CommunityAchievement => ({
        id: text(item?.id ?? item?.ID) || `ACH-${index + 1}`,
        title: text(item?.title ?? item?.Title),
        description: text(item?.description ?? item?.Description),
        date: text(item?.date ?? item?.Date),
        status: text(item?.status ?? item?.Status) || "Published",
        imageUrl: url(item?.imageUrl ?? item?.ImageURL ?? item?.["Image URL"]),
        link: url(item?.link ?? item?.Link),
        updatedAt: text(item?.updatedAt ?? item?.UpdatedAt ?? item?.["Updated At"]),
      }))
      .filter((item: CommunityAchievement) => item.title && (item.status || "").toLowerCase() !== "hidden")
      .sort((a: CommunityAchievement, b: CommunityAchievement) => {
        const ad = Date.parse(a.date || ""), bd = Date.parse(b.date || "");
        if (Number.isFinite(ad) && Number.isFinite(bd) && ad !== bd) return bd - ad;
        return String(b.updatedAt || b.date || "").localeCompare(String(a.updatedAt || a.date || ""));
      });
  } catch (error) { console.error("Community achievements read error:", error); return []; }
  finally { clearTimeout(timeout); }
}
