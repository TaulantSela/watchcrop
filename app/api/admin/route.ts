import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, min } from "drizzle-orm";
import { getDb } from "@/db";
import { aliases, puzzles, watches } from "@/db/schema";
import { isAdminRequest } from "@/lib/admin-auth";
import { todayKey } from "@/lib/daily";
import { normalize } from "@/lib/normalize";
import { cutAndStore, isScheduled } from "@/lib/photo-pipeline";
import { PhotoStoreMissingError } from "@/lib/photo-store";
import { PHOTO_SOURCES, schedulingProblems } from "@/lib/provenance";
import { puzzleNumberFor } from "@/lib/schedule";

export const runtime = "nodejs";

const optText = (max: number) => z.string().trim().max(max).optional();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const CropSpec = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
  blur: z.number().min(0).max(50),
});

const MaskRect = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
});

const AddWatch = z.object({
  action: z.literal("addWatch"),
  brand: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(120),
  reference: optText(60),
  year: z.coerce.number().int().min(1800).max(2100).optional(),
  movement: optText(120),
  priceTier: z.enum(["entry", "mid", "luxury", "grail"]).default("mid"),
  difficultyWeight: z.coerce.number().int().min(1).max(5).default(2),
  specBullets: z.array(z.string().trim().max(200)).max(10).default([]),
  affiliateRef: z.string().regex(/^[a-z0-9-]{1,64}$/, "lowercase letters, digits and dashes").optional(),
  // http(s) only: a javascript: URL is a valid URL too.
  affiliateUrl: z.url().max(2000).refine((u) => /^https?:\/\//.test(u), "http(s) only").optional(),
  // Required, no default: someone has to actually say where the photo came from.
  photoSource: z.enum(PHOTO_SOURCES),
  photoLicense: optText(500),
  attribution: optText(500),
  distinctiveDesign: z.boolean().default(false),
  // The photo comes later, through /api/admin/master.
  brandAliases: z.array(z.string().max(60)).max(20).default([]),
  modelAliases: z.array(z.string().max(60)).max(20).default([]),
});

const SetCrops = z.object({
  action: z.literal("setCrops"),
  watchId: z.coerce.number().int(),
  cropSpecs: z.array(CropSpec).length(6),
  logoMasks: z.array(MaskRect).max(20).default([]),
});

const MarkQa = z.object({ action: z.literal("markQa"), watchId: z.coerce.number().int() });
const Schedule = z.object({ action: z.literal("schedule"), watchId: z.coerce.number().int(), puzzleDate: day });
const Unschedule = z.object({ action: z.literal("unschedule"), puzzleDate: day });

const Body = z.discriminatedUnion("action", [AddWatch, SetCrops, MarkQa, Schedule, Unschedule]);

const fail = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error, ...extra }, { status });

export async function POST(req: Request) {
  if (!isAdminRequest(req)) return fail(401, "unauthorized");

  let body;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    const detail = e instanceof z.ZodError ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`) : [];
    return fail(400, "bad request", { detail });
  }

  const db = await getDb();
  const today = todayKey();
  const findWatch = async (id: number) =>
    (await db.select().from(watches).where(eq(watches.id, id)).limit(1))[0];

  switch (body.action) {
    case "addWatch": {
      const { action: _a, brandAliases, modelAliases, ...values } = body;
      if (values.affiliateRef) {
        const [dupe] = await db
          .select({ id: watches.id })
          .from(watches)
          .where(eq(watches.affiliateRef, values.affiliateRef))
          .limit(1);
        if (dupe) return fail(409, `affiliate ref "${values.affiliateRef}" is already used by watch #${dupe.id}`);
      }
      const id = await db.transaction(async (tx) => {
        const [row] = await tx.insert(watches).values(values).returning({ id: watches.id });
        const rows = [
          ...brandAliases.map((a) => ({ kind: "brand", alias: normalize(a), canonical: normalize(values.brand), brand: null })),
          ...modelAliases.map((a) => ({
            kind: "model",
            alias: normalize(a),
            canonical: normalize(values.model),
            brand: normalize(values.brand),
          })),
        ].filter((r) => r.alias);
        if (rows.length) await tx.insert(aliases).values(rows);
        return row.id;
      });
      return NextResponse.json({ ok: true, id });
    }

    case "setCrops": {
      const w = await findWatch(body.watchId);
      if (!w) return fail(404, "no such watch");
      if (!w.masterBlobKey) return fail(422, "upload the master photo first");
      if (await isScheduled(w.id)) return fail(409, "this watch is scheduled: unschedule it before changing its crops");
      let cut;
      try {
        cut = await cutAndStore(w.id, w.masterBlobKey, body.cropSpecs, body.logoMasks);
      } catch (err) {
        if (err instanceof PhotoStoreMissingError) return fail(503, err.message);
        throw err;
      }
      if (!cut.ok) return fail(422, "these crops can't be cut", { problems: cut.problems });
      // New crops are unchecked crops: the logo QA has to be redone.
      await db
        .update(watches)
        .set({ cropSpecs: body.cropSpecs, logoMasks: body.logoMasks, cropKeys: cut.cropKeys, logoQaAt: null })
        .where(eq(watches.id, body.watchId));
      return NextResponse.json({ ok: true });
    }

    case "markQa": {
      const w = await findWatch(body.watchId);
      if (!w) return fail(404, "no such watch");
      if (!w.masterBlobKey || (w.cropKeys?.length ?? 0) !== 6) {
        return fail(422, "upload the master photo and cut all 6 crops before signing off the logo check");
      }
      await db.update(watches).set({ logoQaAt: new Date() }).where(eq(watches.id, body.watchId));
      return NextResponse.json({ ok: true });
    }

    case "schedule": {
      if (body.puzzleDate < today) return fail(422, "can't schedule a day that has already started or passed");
      const w = await findWatch(body.watchId);
      if (!w) return fail(404, "no such watch");
      const problems = schedulingProblems(w);
      if (problems.length) return fail(422, "this watch can't be scheduled yet", { problems });

      const [taken] = await db
        .select({ n: puzzles.puzzleNumber })
        .from(puzzles)
        .where(eq(puzzles.puzzleDate, body.puzzleDate))
        .limit(1);
      if (taken) return fail(409, `${body.puzzleDate} is already scheduled (#${taken.n})`);

      const [{ first }] = await db.select({ first: min(puzzles.puzzleDate) }).from(puzzles);
      if (first && body.puzzleDate < first) {
        return fail(422, `numbers follow the calendar from puzzle #1 (${first}); can't schedule before it`);
      }
      const puzzleNumber = puzzleNumberFor(body.puzzleDate, first ?? body.puzzleDate);
      try {
        await db.insert(puzzles).values({ watchId: body.watchId, puzzleDate: body.puzzleDate, puzzleNumber });
      } catch (err) {
        console.error("schedule insert failed", err);
        return fail(409, "the schedule changed while saving; reload and try again");
      }
      return NextResponse.json({ ok: true, puzzleNumber });
    }

    case "unschedule": {
      // Only future days: today's puzzle is live and past numbers are in shares.
      if (body.puzzleDate <= today) return fail(422, "only future days can be unscheduled");
      const removed = await db
        .delete(puzzles)
        .where(eq(puzzles.puzzleDate, body.puzzleDate))
        .returning({ n: puzzles.puzzleNumber });
      if (!removed.length) return fail(404, "nothing scheduled that day");
      return NextResponse.json({ ok: true });
    }
  }
}
