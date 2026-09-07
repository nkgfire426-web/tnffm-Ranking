import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const IMAGE_TIMEOUT_MS = 8_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

type DriveSource = { fileId: string; resourceKey?: string };

function getDriveFile(source: string): DriveSource | null {
  try {
    const parsed = new URL(source);
    const pathMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/i);
    const fileId = pathMatch?.[1] || parsed.searchParams.get("id") || parsed.pathname.match(/\/open\/([^/]+)/i)?.[1] || "";
    if (!fileId) return null;
    const resourceKey = parsed.searchParams.get("resourcekey") || parsed.searchParams.get("resourceKey") || undefined;
    return { fileId: decodeURIComponent(fileId), resourceKey };
  } catch {
    return null;
  }
}

function isAllowedDriveHost(value: string) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === "drive.google.com" || host.endsWith(".drive.google.com") || host === "drive.usercontent.google.com" || host === "drive.googleusercontent.com";
  } catch {
    return false;
  }
}

async function requestImage(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
  try {
    return await fetch(url, {
      cache: "force-cache",
      redirect: "follow",
      headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,image/*,*/*;q=0.8", "User-Agent": "TNFFM-Image-Proxy/1.0" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function readImage(response: Response) {
  const declaredSize = Number(response.headers.get("content-length") || 0);
  if (declaredSize > MAX_IMAGE_BYTES) throw new Error("Image is larger than the 8 MB limit.");
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_IMAGE_BYTES) throw new Error("Image is larger than the 8 MB limit.");
  return buffer;
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("url")?.trim();
  if (!source) return new NextResponse("Missing image URL", { status: 400 });
  if (!isAllowedDriveHost(source)) return new NextResponse("Only public Google Drive image URLs are supported.", { status: 400 });

  try {
    const drive = getDriveFile(source);
    if (!drive) return new NextResponse("Could not find the Google Drive file ID", { status: 400 });

    const resource = drive.resourceKey ? `&resourcekey=${encodeURIComponent(drive.resourceKey)}` : "";
    const id = encodeURIComponent(drive.fileId);
    const candidates = [
      `https://drive.google.com/thumbnail?id=${id}&sz=w1600${resource}`,
      `https://drive.google.com/uc?export=view&id=${id}${resource}`,
      `https://drive.google.com/uc?export=download&id=${id}${resource}`,
      `https://drive.usercontent.google.com/download?id=${id}&export=view&confirm=t${resource}`,
    ];

    let imageBuffer: ArrayBuffer | null = null;
    let contentType = "";

    for (const candidateUrl of candidates) {
      try {
        const candidate = await requestImage(candidateUrl);
        const type = (candidate.headers.get("content-type") || "").toLowerCase();
        if (!candidate.ok || !type.startsWith("image/")) {
          try { await candidate.body?.cancel(); } catch { /* ignore */ }
          continue;
        }
        imageBuffer = await readImage(candidate);
        contentType = type.split(";")[0] || "image/jpeg";
        break;
      } catch {
        // Try the next supported Google Drive endpoint.
      }
    }

    if (!imageBuffer) return new NextResponse("Google Drive image could not be loaded. Make sure the file is shared as Anyone with the link → Viewer and keep the original Drive sharing URL.", { status: 502 });

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
        "Access-Control-Allow-Origin": "*",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "Image source timed out." : error instanceof Error ? error.message : "Unable to load image";
    return new NextResponse(message, { status: 502 });
  }
}
