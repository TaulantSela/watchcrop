import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { affiliateClicks, watches } from "@/db/schema";
import { todayKey } from "@/lib/daily";

export const runtime = "nodejs";

/**
 * Tracked affiliate redirect. Logs the click to OUR table (so you measure real
 * EPC, not the affiliate dashboard's lossy attribution), then 302s to the
 * destination. FTC: the reveal screen that links here must disclose affiliate
 * links.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ ref: string }> },
) {
  const { ref } = await params;
  const db = await getDb();

  const rows = await db
    .select({ url: watches.affiliateUrl })
    .from(watches)
    .where(eq(watches.affiliateRef, ref))
    .limit(1);

  const dest = rows[0]?.url;

  // Log regardless — even a missing dest is a signal worth keeping.
  await db.insert(affiliateClicks).values({
    ref,
    puzzleDate: todayKey(),
    referer: req.headers.get("referer"),
    userAgent: req.headers.get("user-agent"),
  });

  if (!dest) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.redirect(dest, { status: 302 });
}
