import { NextResponse } from "next/server";
import { getCatalogIndex } from "@/lib/game";

export const runtime = "nodejs";

/**
 * The full-catalog autocomplete index. Returning EVERY brand/model leaks
 * nothing about today's answer, and lets the client run Fuse.js locally with
 * zero per-keystroke server calls.
 */
export async function GET() {
  const index = await getCatalogIndex();
  return NextResponse.json(index, {
    headers: { "cache-control": "public, max-age=3600" },
  });
}
