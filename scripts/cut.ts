import "dotenv/config";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { getDb } from "../db/index";
import { watches, type CropSpec } from "../db/schema";

/**
 * PRODUCTION image pipeline. Cuts the 6 crops from a watch's master photo
 * (which YOU own) once, applying the crop rect + blur for each level, and
 * writes them to ./crops/<watchId>/<index>.jpg.
 *
 * Crops are derived OFFLINE from one clean master, then a human QAs that no
 * logo/wordmark survived before the watch is ever scheduled (then "Sign off
 * logo check" in /admin/crop). To wire these into the game, upload them to
 * private storage and change app/api/crop/[date]/[index]/route.ts to serve the
 * pre-cut file for today's watch instead of the demo SVG. Token gating stays.
 *
 * Output goes to ./crops (gitignored), NOT ./public: anything in public/ is
 * served to anyone at a guessable URL, crop 6 included, bypassing the tokens.
 *
 * Usage: place master at ./masters/<masterBlobKey>, then `tsx scripts/cut.ts <watchId>`
 */

async function main() {
  const watchId = Number(process.argv[2]);
  if (!Number.isInteger(watchId)) throw new Error("usage: tsx scripts/cut.ts <watchId>");

  const db = await getDb();
  const [w] = await db.select().from(watches).where(eq(watches.id, watchId)).limit(1);
  if (!w) throw new Error(`no watch ${watchId}`);
  if (!w.masterBlobKey) throw new Error("watch has no masterBlobKey");
  const specs = (w.cropSpecs ?? []) as CropSpec[];
  if (specs.length !== 6) throw new Error(`expected 6 crop specs, got ${specs.length}`);

  const master = await readFile(path.join("masters", w.masterBlobKey));
  const outDir = path.join("crops", String(watchId));
  await mkdir(outDir, { recursive: true });

  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    let pipe = sharp(master).extract({ left: s.x, top: s.y, width: s.w, height: s.h });
    if (s.blur > 0) pipe = pipe.blur(s.blur);
    await pipe
      .resize(800, 800, { fit: "cover" })
      .jpeg({ quality: 82 })
      .toFile(path.join(outDir, `${i}.jpg`));
    console.log(`wrote crop ${i}`);
  }
  console.log(`Now QA ${outDir}: confirm NO logo/wordmark is visible in any crop, then sign off in /admin/crop.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
