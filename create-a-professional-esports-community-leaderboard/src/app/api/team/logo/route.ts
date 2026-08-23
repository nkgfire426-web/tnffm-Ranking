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

function isDrive(value: string) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === "drive.google.com" || host.endsWith(".drive.google.com");
  } catch {
    return false;
  }
}

async function requestImage(url: string) {
  return fetch(url, {
    cache: "no-store",
    redirect: "follow",
    headers: {
      Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,image/*,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0",
    },
  });
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("url");

  if (!source) {
    return new NextResponse("Missing image URL", { status: 400 });
  }

  try {
    let response: Response | null = null;

    if (isDrive(source)) {
      const fileId = getDriveFileId(source);

      if (!fileId) {
        return new NextResponse("Could not find the Google Drive file ID", { status: 400 });
      }

      // Drive's thumbnail endpoint is much more reliable for public image files
      // than the download endpoint, especially for PNG/JPG team logos.
      const candidates = [
        `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1600`,
        `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`,
        `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`,
        `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=view&confirm=t`,
      ];

      for (const candidateUrl of candidates) {
        try {
          const candidate = await requestImage(candidateUrl);
          const type = (candidate.headers.get("content-type") || "").toLowerCase();

          if (candidate.ok && type.startsWith("image/")) {
            response = candidate;
            break;
          }
        } catch {
          // Continue to the next Drive endpoint.
        }
      }
    } else {
      const parsed = new URL(source);

      if (!/^https?:$/.test(parsed.protocol)) {
        throw new Error("Invalid image URL protocol");
      }

      response = await requestImage(parsed.toString());
    }

    if (!response) {
      return new NextResponse(
        "Google Drive logo could not be loaded. Set the file to Anyone with the link → Viewer and use the Drive file sharing URL.",
        { status: 502 }
      );
    }

    if (!response.ok) {
      return new NextResponse("Unable to load image", { status: 502 });
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.toLowerCase().startsWith("image/")) {
      return new NextResponse("The supplied URL did not return an image", { status: 415 });
    }

    return new NextResponse(await response.arrayBuffer(), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new NextResponse(
      error instanceof Error ? error.message : "Unable to load image",
      { status: 400 }
    );
  }
}
