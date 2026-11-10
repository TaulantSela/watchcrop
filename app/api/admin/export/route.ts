import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { waitlist } from "@/db/schema";
import { isAdminToken } from "@/lib/admin-auth";
import { csvField } from "@/lib/csv";

export const runtime = "nodejs";

/** Waitlist as CSV, for the launch email. GET /api/admin/export?token=… */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!isAdminToken(token)) return new Response("unauthorized", { status: 401 });

  const db = await getDb();
  const rows = await db.select().from(waitlist).orderBy(asc(waitlist.createdAt));

  const header = ["email", "signed_up_at", "form", "utm_source", "utm_medium", "utm_campaign", "referrer_host"];
  const lines = rows.map((r) =>
    [r.email, r.createdAt, r.source, r.utmSource, r.utmMedium, r.utmCampaign, r.referrerHost]
      .map(csvField)
      .join(","),
  );

  return new Response([header.join(","), ...lines].join("\n") + "\n", {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="waitlist-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
