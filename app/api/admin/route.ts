import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { puzzles, watches } from "@/db/schema";

export const runtime = "nodejs";

function authed(req: Request): boolean {
  const token = req.headers.get("x-admin-token");
  return !!token && !!process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN;
}

const AddWatch = z.object({
  action: z.literal("addWatch"),
  brand: z.string().min(1),
  model: z.string().min(1),
  reference: z.string().optional(),
  year: z.coerce.number().int().optional(),
  movement: z.string().optional(),
  priceTier: z.enum(["entry", "mid", "luxury", "grail"]).default("mid"),
  difficultyWeight: z.coerce.number().int().min(1).max(5).default(2),
  specBullets: z.array(z.string()).default([]),
  affiliateRef: z.string().optional(),
  affiliateUrl: z.string().url().optional(),
  distinctiveDesign: z.boolean().default(false),
  photoSource: z.enum(["own", "licensed", "cc-by", "community"]).optional(),
  photoLicense: z.string().optional(),
  attribution: z.string().optional(),
});

const Schedule = z.object({
  action: z.literal("schedule"),
  watchId: z.coerce.number().int(),
  puzzleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const Body = z.discriminatedUnion("action", [AddWatch, Schedule]);

export async function POST(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "bad request", detail: String(e) }, { status: 400 });
  }

  const db = await getDb();

  if (body.action === "addWatch") {
    const { action: _a, ...values } = body;
    const [row] = await db.insert(watches).values(values).returning({ id: watches.id });
    return NextResponse.json({ ok: true, id: row.id });
  }

  // schedule: refuse watches missing photo provenance (compliance gate)
  const [w] = await db.select().from(watches).where(eq(watches.id, body.watchId)).limit(1);
  if (!w) return NextResponse.json({ error: "no such watch" }, { status: 404 });
  if (!w.photoSource) {
    return NextResponse.json(
      { error: "watch is missing photo_source — refusing to schedule (provenance gate)" },
      { status: 422 },
    );
  }

  const [last] = await db
    .select({ n: puzzles.puzzleNumber })
    .from(puzzles)
    .orderBy(desc(puzzles.puzzleNumber))
    .limit(1);
  const puzzleNumber = (last?.n ?? 0) + 1;

  try {
    await db.insert(puzzles).values({ watchId: body.watchId, puzzleDate: body.puzzleDate, puzzleNumber });
  } catch {
    return NextResponse.json({ error: "that date is already scheduled" }, { status: 409 });
  }
  return NextResponse.json({ ok: true, puzzleNumber });
}
