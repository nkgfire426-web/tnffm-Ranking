import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing image URL", { status: 400 });

  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) return new NextResponse("Invalid image URL", { status: 400 });
    const response = await fetch(parsed.toString(), { cache: "no-store" });
    if (!response.ok) return new NextResponse("Unable to load image", { status: 502 });
    const contentType = response.headers.get("content-type") || "image/png";
    if (!contentType.startsWith("image/")) return new NextResponse("URL is not an image", { status: 415 });
    return new NextResponse(await response.arrayBuffer(), {
      status: 200,
      headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*" },
    });
  } catch {
    return new NextResponse("Unable to load image", { status: 400 });
  }
}
