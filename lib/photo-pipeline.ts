import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { puzzles, watches, type CropSpec, type MaskRect } from "@/db/schema";
import { cropPathnames, cropProblems, cutCrops, orientMaster } from "./crops";
import { photoStore } from "./photo-store";

export type CutResult = { ok: true; cropKeys: string[] } | { ok: false; problems: string[] };

/**
 * Loads the master, checks the rectangles against it, cuts the six crops and
 * stores them. The caller saves the returned keys on the watch.
 */
export async function cutAndStore(
  watchId: number,
  masterKey: string,
  specs: CropSpec[],
  masks: MaskRect[],
): Promise<CutResult> {
  const store = photoStore();
  const master = await store.get(masterKey);
  if (!master) return { ok: false, problems: ["The master photo is missing from storage: upload it again."] };

  const { image, size } = await orientMaster(master);
  const problems = cropProblems(specs, masks, size);
  if (problems.length) return { ok: false, problems };

  const crops = await cutCrops(image, specs, masks);
  const cropKeys = cropPathnames(watchId, masterKey, specs, masks);
  await Promise.all(crops.map((c, i) => store.put(cropKeys[i], c, "image/webp")));
  return { ok: true, cropKeys };
}

/**
 * A scheduled watch's photos are frozen: its crops passed the gate when it
 * was scheduled, and past puzzles are already in people's shares. Unschedule
 * a future day first to change them.
 */
export async function isScheduled(watchId: number): Promise<boolean> {
  const db = await getDb();
  const [row] = await db.select({ id: puzzles.id }).from(puzzles).where(eq(puzzles.watchId, watchId)).limit(1);
  return Boolean(row);
}

export async function findWatch(id: number) {
  const db = await getDb();
  return (await db.select().from(watches).where(eq(watches.id, id)).limit(1))[0];
}
