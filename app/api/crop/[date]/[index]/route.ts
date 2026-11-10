import { NextResponse } from "next/server";
import { placeholderCropSvg, seedFrom } from "@/lib/cropImage";
import { verifyCrop } from "@/lib/sign";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ date: string; index: string }> },
) {
  const { date, index } = await params;
  const cropIndex = Number(index);
  if (!Number.isInteger(cropIndex) || cropIndex < 0 || cropIndex > 5) {
    return NextResponse.json({ error: "bad crop index" }, { status: 400 });
  }

  // Teaser strip on the landing page is public (no token, no real answer).
  const isTeaser = date === "teaser";
  if (!isTeaser) {
    const token = new URL(req.url).searchParams.get("t") ?? "";
    if (!verifyCrop(date, cropIndex, token)) {
      // You only get a crop you've earned. Future crops of today's watch are
      // unreachable without the signed token returned by /api/guess.
      return NextResponse.json({ error: "not unlocked" }, { status: 403 });
    }
  }

  const svg = placeholderCropSvg(seedFrom(date), cropIndex);
  return new NextResponse(svg, {
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=86400, immutable",
    },
  });
}
