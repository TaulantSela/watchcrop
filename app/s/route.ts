import { NextResponse } from "next/server";

/**
 * The link in shared results ("watchcrop.app/s"): short enough to paste, and
 * tagged so visits and signups from shares show up as their own source in the
 * admin demand panel. The share-card loop is the growth engine; this measures it.
 */
export function GET(req: Request) {
  return NextResponse.redirect(new URL("/play?utm_source=share", req.url), 307);
}
