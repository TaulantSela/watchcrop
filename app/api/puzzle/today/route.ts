import { NextResponse } from "next/server";
import { MAX_CROPS, todayKey } from "@/lib/daily";
import { getTodayPuzzle } from "@/lib/game";
import { cropUrl } from "@/lib/sign";

export const runtime = "nodejs";

/**
 * Serves what the client needs to START playing — and nothing more.
 * Critically: NO brand, model, reference, or future crop is included. The page
 * loads knowing only the date, puzzle number, and the crop-0 image URL.
 */
export async function GET() {
  const date = todayKey();
  const puzzle = await getTodayPuzzle(date);

  if (!puzzle) {
    return NextResponse.json({ available: false, date });
  }

  return NextResponse.json({
    available: true,
    date,
    puzzleNumber: puzzle.puzzleNumber,
    sponsored: false,
    maxCrops: MAX_CROPS,
    firstCropUrl: cropUrl(date, 0),
  });
}
