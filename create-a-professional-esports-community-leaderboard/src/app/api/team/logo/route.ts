import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getDriveFileId(value: string) {
  try {
    const parsed = new URL(value);
    const pathMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/i);
    if (pathMatch?.[1]) return pathMatch[1];

    const queryId = parsed.searchParams.get("id");
    if (queryId) return queryId;

    const openMatch = parsed.pathname.match(/\/open\/([^/]+)/i);
    if (openMatch?.[1]) return openMatch[1];
  } catch {
    return null;
  }
  return null;
}

function isGoogleDriveUrl(value: string) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "drive.google.com" || hostname.endsWith(".drive.google.com");
  } catch {
    return false;
  }
}

async function fetchImage(url: string) {
  return fetch(url, {
    cache: "no-store",
    redirect: "follow",
    headers: {
      Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,image/*,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; TNFFM-TeamLogo/1.0)",
    },
  });
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing image URL", { status: 400 });

  try {
    let response: Response | null = null;

    if (isGoogleDriveUrl(url)) {
      const fileId = getDriveFileId(url);
      if (!fileId) return new NextResponse("Invalid Google Drive file URL", { status: 400 });

      // Try the current Drive download endpoint first, then the older UC endpoint.
      const driveUrls = [
        `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=view&confirm=t`,
        `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`,
        `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`,
      ];

      for (const driveUrl of driveUrls) {
        try {
          const candidate = await fetchImage(driveUrl);
          const contentType = candidate.headers.get("content-type") || "";
          if (candidate.ok && contentType.toLowerCase().startsWith("image/")) {
            response = candidate;
            break;
          }
        } catch {
          // Try the next Drive endpoint.
        }
      }
    } else {
      const parsed = new URL(url);
      if (!/^https?:$/.test(parsed.protocol)) throw new Error("Invalid protocol");
      response = await fetchImage(parsed.toString());
    }

    if (!response) return new NextResponse("Unable to load Google Drive image. Make sure the file is shared as Anyone with the link.", { status: 502 });
    if (!response.ok) return new NextResponse("Unable to load image", { status: 502 });

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return new NextResponse("The URL did not return an image", { status: 415 });
    }

    return new NextResponse(await response.arrayBuffer(), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new NextResponse("Unable to load image", { status: 400 });
  }
}
