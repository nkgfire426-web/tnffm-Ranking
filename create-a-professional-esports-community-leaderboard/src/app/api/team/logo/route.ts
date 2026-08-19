import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function normalizeImageUrl(value: string) {
  const parsed = new URL(value);
  if (!/^https?:$/.test(parsed.protocol)) throw new Error("Invalid protocol");

  // Google Drive share links normally return an HTML viewer page. Convert them
  // to the direct download endpoint so poster generation receives image bytes.
  if (parsed.hostname === "drive.google.com" || parsed.hostname.endsWith(".drive.google.com")) {
    const match = parsed.pathname.match(/\/file\/d\/([^/]+)/);
    const id = match?.[1] || parsed.searchParams.get("id");
    if (id) return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
  }

  return parsed.toString();
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing image URL", { status: 400 });

  try {
    const imageUrl = normalizeImageUrl(url);
    const response = await fetch(imageUrl, {
      cache: "no-store",
      redirect: "follow",
      headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8" },
    });

    if (!response.ok) return new NextResponse("Unable to load image", { status: 502 });

    const contentType = response.headers.get("content-type") || "";
    const bytes = await response.arrayBuffer();
    const looksLikeImage = contentType.startsWith("image/") ||
      new Uint8Array(bytes.slice(0, 4)).some((byte) => byte !== 0);

    if (!looksLikeImage) return new NextResponse("URL is not an image", { status: 415 });

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType.startsWith("image/") ? contentType : "image/png",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new NextResponse("Unable to load image", { status: 400 });
  }
}
