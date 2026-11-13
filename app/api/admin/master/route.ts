import { NextResponse } from "next/server";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { watches } from "@/db/schema";
import { isAdminRequest } from "@/lib/admin-auth";
import { defaultCropSpecs, MIN_MASTER_SIDE, orientMaster } from "@/lib/crops";
import { cutAndStore, findWatch, isScheduled } from "@/lib/photo-pipeline";
import { photoStore, PhotoStoreMissingError } from "@/lib/photo-store";

export const runtime = "nodejs";

const fail = (status: number, error: string, problems: string[] = []) =>
  NextResponse.json({ error, problems }, { status });

/**
 * Uploads a watch's master photo (multipart: watchId, file), stores it in the
 * private store, and cuts a default set of six crops from it so they can be
 * reviewed straight away. The admin page re-encodes the photo to JPEG first,
 * which keeps it under the 4.5 MB request limit and drops its EXIF (location).
 * A new photo resets the crops, the logo masks and the logo check.
 */
export async function POST(req: Request) {
  if (!isAdminRequest(req)) return fail(401, "unauthorized");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, "expected a multipart upload");
  }
  const watchId = Number(form.get("watchId"));
  const file = form.get("file");
  if (!Number.isInteger(watchId) || !(file instanceof File)) return fail(400, "watchId and file are required");

  const watch = await findWatch(watchId);
  if (!watch) return fail(404, "no such watch");
  if (await isScheduled(watchId)) return fail(409, "this watch is scheduled: unschedule it before changing its photo");

  const bytes = Buffer.from(await file.arrayBuffer());
  let format: string | undefined;
  try {
    format = (await sharp(bytes).metadata()).format;
  } catch {
    return fail(415, "that file isn't an image sharp can read");
  }
  if (!format || !["jpeg", "png", "webp"].includes(format)) return fail(415, `unsupported image format: ${format}`);

  const { size } = await orientMaster(bytes);
  if (Math.min(size.width, size.height) < MIN_MASTER_SIDE) {
    return fail(422, `the photo is ${size.width}×${size.height}; it needs at least ${MIN_MASTER_SIDE}px on its short side`);
  }

  try {
    const masterKey = `masters/${watchId}/${Date.now()}.${format === "jpeg" ? "jpg" : format}`;
    await photoStore().put(masterKey, bytes, `image/${format}`);

    const cropSpecs = defaultCropSpecs(size);
    const cut = await cutAndStore(watchId, masterKey, cropSpecs, []);
    if (!cut.ok) return fail(422, "couldn't cut the default crops", cut.problems);

    const db = await getDb();
    await db
      .update(watches)
      .set({
        masterBlobKey: masterKey,
        masterWidth: size.width,
        masterHeight: size.height,
        cropSpecs,
        logoMasks: [],
        cropKeys: cut.cropKeys,
        logoQaAt: null,
      })
      .where(eq(watches.id, watchId));
    return NextResponse.json({ ok: true, ...size });
  } catch (err) {
    if (err instanceof PhotoStoreMissingError) return fail(503, err.message);
    console.error("master upload failed", err);
    return fail(500, "upload failed; see the function logs");
  }
}
