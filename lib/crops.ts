import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";
import type { CropSpec, MaskRect } from "@/db/schema";
import { MAX_CROPS } from "./daily";

/**
 * The photo pipeline: one master photo you own -> six crops, cut once on the
 * server when the crops are saved. The cut files are stored, shown in the
 * admin for the logo check, and served to players byte for byte, so what was
 * signed off is exactly what people see.
 */

/** Side of every served crop, in pixels. */
export const CROP_SIZE = 800;
/** Masters smaller than this can't fill crop 6 without upscaling. */
export const MIN_MASTER_SIDE = CROP_SIZE;

/** How far each crop zooms in on the default ladder: crop 1 macro -> crop 6 whole. */
const ZOOM = [3.0, 2.2, 1.6, 1.25, 1.05, 1.0];

export type Size = { width: number; height: number };

/**
 * A starting point the admin can then edit: six centered squares zooming
 * out from a third of the frame to the whole short side. No blur.
 */
export function defaultCropSpecs({ width, height }: Size): CropSpec[] {
  const side = Math.min(width, height);
  return ZOOM.map((z) => {
    const s = Math.floor(side / z);
    return { x: Math.floor((width - s) / 2), y: Math.floor((height - s) / 2), w: s, h: s, blur: 0 };
  });
}

const inside = (r: { x: number; y: number; w: number; h: number }, { width, height }: Size) =>
  r.x >= 0 && r.y >= 0 && r.w > 0 && r.h > 0 && r.x + r.w <= width && r.y + r.h <= height;

/** Human-readable reasons these rectangles can't be cut from this master. */
export function cropProblems(specs: CropSpec[], masks: MaskRect[], size: Size): string[] {
  const problems: string[] = [];
  if (specs.length !== MAX_CROPS) problems.push(`Needs exactly ${MAX_CROPS} crop rectangles.`);
  specs.forEach((s, i) => {
    if (!inside(s, size)) problems.push(`Crop ${i + 1} falls outside the ${size.width}×${size.height} photo.`);
  });
  masks.forEach((m, i) => {
    if (!inside(m, size)) problems.push(`Logo mask ${i + 1} falls outside the ${size.width}×${size.height} photo.`);
  });
  return problems;
}

/** The master with EXIF orientation applied, so rectangles match what you see. */
export async function orientMaster(master: Buffer): Promise<{ image: Buffer; size: Size }> {
  const { data, info } = await sharp(master).rotate().toBuffer({ resolveWithObject: true });
  return { image: data, size: { width: info.width, height: info.height } };
}

/**
 * Blurs each mask region so hard that no lettering survives, in every crop.
 * The blurred patch is fully opaque over the mask itself and fades out over a
 * margin around it, so it reads as a soft smudge rather than a pasted box.
 */
async function applyMasks(image: Buffer, masks: MaskRect[]): Promise<Buffer> {
  if (!masks.length) return image;
  const { width: W = 0, height: H = 0 } = await sharp(image).metadata();
  const patches = await Promise.all(
    masks.map(async (m) => {
      const feather = Math.max(8, Math.round(Math.min(m.w, m.h) * 0.35));
      const left = Math.max(0, m.x - feather);
      const top = Math.max(0, m.y - feather);
      const width = Math.min(W, m.x + m.w + feather) - left;
      const height = Math.min(H, m.y + m.h + feather) - top;

      const blurred = await sharp(image)
        .extract({ left, top, width, height })
        .blur(Math.max(20, Math.min(m.w, m.h) / 3))
        .removeAlpha()
        .toBuffer();
      // Alpha: a rounded rect a little larger than the mask, softened, so it's
      // ~100% over the mask (3σ inside the edge) and fades to ~0 at the margin.
      const grow = feather * 0.6;
      const rect = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect x="${m.x - left - grow}" y="${m.y - top - grow}" width="${m.w + 2 * grow}" height="${m.h + 2 * grow}" rx="${grow}" fill="#fff"/></svg>`;
      const alpha = await sharp(Buffer.from(rect))
        .flatten({ background: "#000" })
        .blur(feather * 0.2)
        .extractChannel(0)
        .png()
        .toBuffer();
      return { input: await sharp(blurred).joinChannel(alpha).png().toBuffer(), left, top };
    }),
  );
  return sharp(image).composite(patches).toBuffer();
}

/**
 * Cuts the six crops from an ORIENTED master (see orientMaster). Output is
 * square WebP with no metadata: nothing from the master's EXIF (camera,
 * location) reaches players.
 */
export async function cutCrops(oriented: Buffer, specs: CropSpec[], masks: MaskRect[] = []): Promise<Buffer[]> {
  const masked = await applyMasks(oriented, masks);
  return Promise.all(
    specs.map((s) => {
      let pipe = sharp(masked).extract({ left: s.x, top: s.y, width: s.w, height: s.h });
      if (s.blur > 0) pipe = pipe.blur(s.blur);
      return pipe.resize(CROP_SIZE, CROP_SIZE, { fit: "cover" }).webp({ quality: 82 }).toBuffer();
    }),
  );
}

/**
 * Content-addressed crop paths: new rectangles, masks or master give new
 * paths, so a cached old crop can never be served for a changed one.
 */
export function cropPathnames(watchId: number, masterKey: string, specs: CropSpec[], masks: MaskRect[]): string[] {
  const version = createHash("sha256")
    .update(JSON.stringify({ masterKey, specs, masks }))
    .digest("hex")
    .slice(0, 16);
  return specs.map((_, i) => `crops/${watchId}/${version}/${i}.webp`);
}
