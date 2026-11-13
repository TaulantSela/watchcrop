import sharp from "sharp";
import { isAdminRequest } from "@/lib/admin-auth";
import { findWatch } from "@/lib/photo-pipeline";
import { photoStore, PhotoStoreMissingError } from "@/lib/photo-store";

export const runtime = "nodejs";

/** Longest side of the master preview the admin draws rectangles over. */
const PREVIEW_SIDE = 1600;

/**
 * Admin-only view of a watch's private photos, for authoring and the logo
 * check: `master` (a downscaled, EXIF-rotated preview) or a crop `0`–`5`
 * (the stored file, exactly what players get). Signed-in admin only.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ watchId: string; file: string }> },
) {
  if (!isAdminRequest(req)) return new Response("unauthorized", { status: 401 });

  const { watchId, file } = await params;
  const watch = await findWatch(Number(watchId));
  if (!watch) return new Response("no such watch", { status: 404 });

  const key = file === "master" ? watch.masterBlobKey : /^[0-5]$/.test(file) ? watch.cropKeys?.[Number(file)] : null;
  if (!key) return new Response("not found", { status: 404 });

  try {
    const bytes = await photoStore().get(key);
    if (!bytes) return new Response("missing from storage", { status: 404 });

    const body =
      file === "master"
        ? await sharp(bytes)
            .rotate()
            .resize(PREVIEW_SIDE, PREVIEW_SIDE, { fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer()
        : bytes;
    return new Response(new Uint8Array(body), {
      headers: {
        "content-type": file === "master" ? "image/jpeg" : "image/webp",
        // Paths are content-addressed and the URL carries the version.
        "cache-control": "private, max-age=3600",
      },
    });
  } catch (err) {
    if (err instanceof PhotoStoreMissingError) return new Response(err.message, { status: 503 });
    throw err;
  }
}
