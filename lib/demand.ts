import "server-only";
import { gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { visits, waitlist } from "@/db/schema";
import { addDays } from "./schedule";

export type DemandRow = { visits: number; signups: number };
export type DemandStats = {
  totalSignups: number;
  /** Last 14 UTC days, oldest first. */
  days: ({ date: string } & DemandRow)[];
  /** Last 30 days by first-touch source, biggest first. */
  sources: ({ source: string } & DemandRow)[];
};

/** Conversion rate as a whole percent, or null when there were no visits. */
export function conversion(r: DemandRow): number | null {
  return r.visits ? Math.round((r.signups / r.visits) * 100) : null;
}

/**
 * The Phase 0 gate numbers: are people signing up, and from where? Groups by
 * the same first-touch label for visits and signups so the rates line up.
 */
export async function getDemandStats(now = new Date()): Promise<DemandStats> {
  const db = await getDb();
  const today = now.toISOString().slice(0, 10);
  const since14 = new Date(`${addDays(today, -13)}T00:00:00Z`);
  const since30 = new Date(`${addDays(today, -29)}T00:00:00Z`);

  const dayOf = (c: typeof visits.createdAt | typeof waitlist.createdAt) =>
    sql<string>`to_char(${c}, 'YYYY-MM-DD')`;
  const sourceOf = (t: typeof visits | typeof waitlist) =>
    sql<string>`coalesce(${t.utmSource}, ${t.referrerHost}, 'direct')`;
  const n = sql<number>`count(*)::int`;

  const [[{ total }], visitDays, signupDays, visitSources, signupSources] = await Promise.all([
    db.select({ total: n }).from(waitlist),
    db.select({ k: dayOf(visits.createdAt), n }).from(visits).where(gte(visits.createdAt, since14)).groupBy(sql`1`),
    db.select({ k: dayOf(waitlist.createdAt), n }).from(waitlist).where(gte(waitlist.createdAt, since14)).groupBy(sql`1`),
    db.select({ k: sourceOf(visits), n }).from(visits).where(gte(visits.createdAt, since30)).groupBy(sql`1`),
    db.select({ k: sourceOf(waitlist), n }).from(waitlist).where(gte(waitlist.createdAt, since30)).groupBy(sql`1`),
  ]);

  const toMap = (rows: { k: string; n: number }[]) => new Map(rows.map((r) => [r.k, r.n]));
  const vd = toMap(visitDays);
  const sd = toMap(signupDays);
  const vs = toMap(visitSources);
  const ss = toMap(signupSources);

  const days = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(today, i - 13);
    return { date, visits: vd.get(date) ?? 0, signups: sd.get(date) ?? 0 };
  });
  const sources = [...new Set([...vs.keys(), ...ss.keys()])]
    .map((source) => ({ source, visits: vs.get(source) ?? 0, signups: ss.get(source) ?? 0 }))
    .sort((a, b) => b.signups - a.signups || b.visits - a.visits);

  return { totalSignups: total, days, sources };
}
