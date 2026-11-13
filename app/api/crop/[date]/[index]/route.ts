import { NextResponse } from "next/server";
import { placeholderCropSvg, seedFrom } from "@/lib/cropImage";
import { getTodayPuzzle } from "@/lib/game";
import { photoStore } from "@/lib/photo-store";
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
  if (date === "teaser") return svg(placeholderCropSvg(seedFrom(date), cropIndex));

  const token = new URL(req.url).searchParams.get("t") ?? "";
  if (!verifyCrop(date, cropIndex, token)) {
    // You only get a crop you've earned. Future crops of today's watch are
    // unreachable without the signed token returned by /api/guess.
    return NextResponse.json({ error: "not unlocked" }, { status: 403 });
  }

  // The real crop, streamed from the private store: it has no public URL, so
  // this token check is the only way to it.
  const puzzle = await getTodayPuzzle(date);
  const key = puzzle?.watch.cropKeys?.[cropIndex];
  if (key) {
    const bytes = await photoStore().get(key);
    if (!bytes) {
      console.error(`[watchcrop] crop ${key} for ${date} is missing from storage`);
      return NextResponse.json({ error: "crop missing" }, { status: 502 });
    }
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "content-type": "image/webp",
        // Safe to cache forever: a scheduled watch's crops can't change, and
        // tokens for a day are only ever issued on that day.
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  }

  // Demo watches (no photo yet) get generated art.
  return svg(placeholderCropSvg(seedFrom(date), cropIndex));
}

function svg(body: string) {
  return new NextResponse(body, {
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=86400, immutable",
    },
  });
}
