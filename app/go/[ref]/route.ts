import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { affiliateClicks, watches } from "@/db/schema";
import { isBot } from "@/lib/bots";
import { todayKey } from "@/lib/daily";

export const runtime = "nodejs";

/** Same shape the admin enforces for affiliate refs. */
const REF = /^[a-z0-9-]{1,64}$/;

/**
 * Tracked affiliate redirect. Logs the click to OUR table (so you measure real
 * EPC, not the affiliate dashboard's lossy attribution), then 302s to the
 * destination. FTC: the reveal screen that links here must disclose affiliate
 * links.
 *
 * Only real clicks on real refs are logged: anything could be typed after
 * /go/, and crawlers following the link would otherwise inflate the EPC
 * denominator.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ ref: string }> },
) {
  const { ref } = await params;
  const home = NextResponse.redirect(new URL("/", req.url));
  if (!REF.test(ref)) return home;

  const db = await getDb();
  const rows = await db
    .select({ url: watches.affiliateUrl })
    .from(watches)
    .where(eq(watches.affiliateRef, ref))
    .limit(1);
  const dest = rows[0]?.url;

  if (!dest) {
    console.warn(`[watchcrop] /go: no destination for affiliate ref "${ref}"`);
    return home;
  }

  const userAgent = req.headers.get("user-agent");
  if (!isBot(userAgent)) {
    await db.insert(affiliateClicks).values({
      ref,
      puzzleDate: todayKey(),
      referer: req.headers.get("referer"),
      userAgent,
    });
  }
  return NextResponse.redirect(dest, { status: 302 });
}
