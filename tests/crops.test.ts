import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { CROP_SIZE, cropPathnames, cropProblems, cutCrops, defaultCropSpecs, orientMaster } from "@/lib/crops";

/** A grey "dial" with a striped red "wordmark" at (500, 300), 200×100. */
const LOGO = { x: 500, y: 300, w: 200, h: 100 };
async function dialWithLogo(): Promise<Buffer> {
  const stripes = Array.from({ length: 10 }, (_, i) =>
    `<rect x="${LOGO.x + i * 20}" y="${LOGO.y}" width="10" height="${LOGO.h}" fill="#ff0000"/>`,
  ).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#808080"/>${stripes}</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toBuffer();
}

/**
 * Mean jump in red between horizontally adjacent pixels of a region. Lettering
 * is sharp edges (stripes: ~13); a blurred smudge, even with a gradient across
 * it, has almost none.
 */
async function redEdges(img: Buffer, r: { left: number; top: number; width: number; height: number }) {
  const { data, info } = await sharp(img).extract(r).raw().toBuffer({ resolveWithObject: true });
  let sum = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x + 1 < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      sum += Math.abs(data[i + info.channels] - data[i]);
    }
  }
  return sum / (info.height * (info.width - 1));
}

describe("default crop ladder", () => {
  it("zooms out from a third of the short side to all of it, centered and in bounds", () => {
    const specs = defaultCropSpecs({ width: 4000, height: 3000 });
    expect(specs).toHaveLength(6);
    expect(specs[0]).toEqual({ x: 1500, y: 1000, w: 1000, h: 1000, blur: 0 });
    expect(specs[5]).toEqual({ x: 500, y: 0, w: 3000, h: 3000, blur: 0 });
    expect(specs.map((s) => s.w)).toEqual([...specs.map((s) => s.w)].sort((a, b) => a - b));
    expect(cropProblems(specs, [], { width: 4000, height: 3000 })).toEqual([]);
  });
});

describe("crop and mask checks", () => {
  const size = { width: 1200, height: 900 };
  it("rejects rectangles outside the photo, and the wrong crop count", () => {
    const specs = defaultCropSpecs(size);
    const bad = [...specs.slice(0, 5), { x: 1000, y: 0, w: 300, h: 300, blur: 0 }];
    expect(cropProblems(bad, [{ x: 1100, y: 850, w: 200, h: 100 }], size)).toEqual([
      "Crop 6 falls outside the 1200×900 photo.",
      "Logo mask 1 falls outside the 1200×900 photo.",
    ]);
    expect(cropProblems(specs.slice(1), [], size)).toEqual(["Needs exactly 6 crop rectangles."]);
  });
});

describe("cutting", () => {
  it("applies EXIF rotation, so rectangles match the photo as you see it", async () => {
    const sideways = await sharp({ create: { width: 1200, height: 800, channels: 3, background: "#777" } })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    expect((await orientMaster(sideways)).size).toEqual({ width: 800, height: 1200 });
  });

  it("cuts six square WebP crops with no EXIF left in them", async () => {
    const { image, size } = await orientMaster(await dialWithLogo());
    const crops = await cutCrops(image, defaultCropSpecs(size));
    expect(crops).toHaveLength(6);
    for (const c of crops) {
      const m = await sharp(c).metadata();
      expect([m.format, m.width, m.height, m.exif]).toEqual(["webp", CROP_SIZE, CROP_SIZE, undefined]);
    }
  });

  it("a logo mask blurs the lettering out of every crop", async () => {
    const { image, size } = await orientMaster(await dialWithLogo());
    // Crop 6 is the 900×900 square at x=150; the logo sits inside it.
    const whole = { x: 150, y: 0, w: 900, h: 900, blur: 0 };
    const scale = CROP_SIZE / 900;
    // The logo's interior in crop-6 pixels (inset past the patch edge, which
    // WebP's chroma subsampling softens: that's not lettering).
    const inset = 8;
    const logoInCrop = {
      left: Math.round((LOGO.x - whole.x) * scale) + inset,
      top: Math.round(LOGO.y * scale) + inset,
      width: Math.round(LOGO.w * scale) - 2 * inset,
      height: Math.round(LOGO.h * scale) - 2 * inset,
    };
    const specs = [...defaultCropSpecs(size).slice(0, 5), whole];

    const [plain] = (await cutCrops(image, specs)).slice(5);
    const [masked] = (await cutCrops(image, specs, [LOGO])).slice(5);
    expect(await redEdges(plain, logoInCrop)).toBeGreaterThan(8);
    expect(await redEdges(masked, logoInCrop)).toBeLessThan(1);
  });
});

describe("crop paths", () => {
  it("change whenever the master, rectangles or masks change", () => {
    const specs = defaultCropSpecs({ width: 1200, height: 900 });
    const a = cropPathnames(7, "masters/7/1.jpg", specs, []);
    expect(a[0]).toMatch(/^crops\/7\/[0-9a-f]{16}\/0\.webp$/);
    expect(cropPathnames(7, "masters/7/1.jpg", specs, [])).toEqual(a);
    expect(cropPathnames(7, "masters/7/2.jpg", specs, [])[0]).not.toBe(a[0]);
    expect(cropPathnames(7, "masters/7/1.jpg", specs, [LOGO])[0]).not.toBe(a[0]);
  });
});
