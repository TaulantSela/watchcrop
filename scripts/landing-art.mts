/**
 * The landing page's art and its demo video, made from an original Watchcraft
 * render (Taulant's own 3D configurator: procedural watches, no third-party
 * photos or models). The art goes through the same crop pipeline as real
 * puzzles (lib/crops.ts), logo mask included.
 *
 *   npm run art:landing
 *     public/landing/crop-{1,3,6}.webp   the strip on the landing page
 *     public/landing/og-{1,3,6}.jpg      the same crops for the share preview
 *     .art/demo-master.jpg               the master photo for the demo puzzle
 *
 *   npm run art:demo -- <base-url>
 *     Puts the sample puzzle on a running local server whose database is EMPTY
 *     (see the steps in recordDemo), plays it in Chrome and records it:
 *     public/landing/demo.{mp4,webm} and demo-poster.webp
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { CropSpec, MaskRect } from "../db/schema";
import puppeteer, { type Page } from "puppeteer-core";
import { cutCrops, orientMaster } from "../lib/crops";
import { todayKey } from "../lib/daily";
import { renderWatch } from "./render-art.mts";

const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const OUT = "public/landing";
const WORK = ".art";

/** The watch: an original blue diver from Watchcraft's options. */
const WATCH_QUERY =
  "shape=round-diver&size=42&crown=3.8&bezel=rotating&insert=min60&insertColor=blue&dial=blue&finish=sunburst" +
  "&indices=lume&hands=lume&seconds=white&strap=five&auto=off";

/** The master photo: the render, centered on a studio backdrop. */
const SIDE = 3000;
/**
 * Where the dial's center sits in the trimmed render (measured once; re-measure
 * if WATCH_QUERY or Watchcraft's camera changes). The master is laid out so it
 * lands at x = SIDE / 2.
 */
const DIAL_IN_RENDER = { x: 867, y: 1257 };
const C = { x: SIDE / 2, y: 66 + DIAL_IN_RENDER.y };
const sq = (cx: number, cy: number, side: number, blur = 0): CropSpec => ({
  x: Math.round(cx - side / 2),
  y: Math.round(cy - side / 2),
  w: side,
  h: side,
  blur,
});

/** Crop 1 (macro) to 6 (whole watch), as in docs/GAME-DESIGN.md. */
export const DEMO_CROPS: CropSpec[] = [
  sq(C.x + 30, C.y - 704, 420), // the lume pip on the bezel
  sq(C.x + 560, C.y - 363, 700), // bezel numerals and minute hashes
  sq(C.x - 234, C.y - 333, 900), // a dial quadrant, hands and the hidden logo
  sq(C.x, C.y, 1620), // the full dial
  sq(C.x + 80, C.y, 2150), // case, bezel and crown
  { x: 0, y: 0, w: SIDE, h: SIDE, blur: 0 }, // the whole watch
];
/** The dial signature, blurred out of every crop like a real puzzle's logo. */
export const DEMO_MASKS: MaskRect[] = [{ x: C.x - 134, y: C.y - 358, w: 260, h: 90 }];

/** The sample puzzle in the demo video. A made-up watch, said so on the page. */
export const DEMO_WATCH = { brand: "Sela", model: "Diver 42" };

async function buildMaster(): Promise<{ master: Buffer; offset: { x: number; y: number } }> {
  const render = path.join(WORK, "render.png");
  await renderWatch(WATCH_QUERY, render, { width: 2200, height: 2200, dpr: 2 });
  const { data: watch, info } = await sharp(render).trim().toBuffer({ resolveWithObject: true });
  const offset = { x: SIDE / 2 - DIAL_IN_RENDER.x, y: 66 };
  // Anything past the edge (the floor shadow on the right) is cut off.
  const watchPart = await sharp(watch)
    .extract({ left: 0, top: 0, width: Math.min(info.width, SIDE - offset.x), height: Math.min(info.height, SIDE - offset.y) })
    .toBuffer();
  const backdrop = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIDE}" height="${SIDE}">
    <defs><radialGradient id="g" cx="50%" cy="44%" r="70%">
      <stop offset="0" stop-color="#1d212a"/><stop offset="0.55" stop-color="#101219"/><stop offset="1" stop-color="#07080c"/>
    </radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/></svg>`;
  const master = await sharp(Buffer.from(backdrop))
    .composite([{ input: watchPart, left: offset.x, top: offset.y }])
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
  return { master, offset };
}

/** The master, the six crops, the landing strip and the share-preview crops. */
async function makeArt() {
  const { master } = await buildMaster();
  writeFileSync(path.join(WORK, "demo-master.jpg"), master);
  const { image } = await orientMaster(master);
  const crops = await cutCrops(image, DEMO_CROPS, DEMO_MASKS);
  mkdirSync(OUT, { recursive: true });
  for (const i of [0, 2, 5]) {
    writeFileSync(path.join(OUT, `crop-${i + 1}.webp`), crops[i]);
    await sharp(crops[i]).resize(400, 400).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(OUT, `og-${i + 1}.jpg`));
  }
  crops.forEach((c, i) => writeFileSync(path.join(WORK, `crop-${i + 1}.webp`), c));

  // For checking the rectangles by eye: the master with every crop and mask drawn on.
  const rects = [
    ...DEMO_CROPS.map((c, i) => `<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" fill="none" stroke="#d4af37" stroke-width="8"/><text x="${c.x + 20}" y="${c.y + 70}" fill="#d4af37" font-size="64" font-family="Helvetica">${i + 1}</text>`),
    ...DEMO_MASKS.map((m) => `<rect x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" fill="rgba(220,38,38,0.5)"/>`),
  ].join("");
  // sharp resizes before it composites, so draw first, then shrink in a second pass.
  const drawn = await sharp(master)
    .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIDE}" height="${SIDE}">${rects}</svg>`) }])
    .png()
    .toBuffer();
  await sharp(drawn).resize(1000).toFile(path.join(WORK, "overlay.png"));
  console.log(`wrote ${OUT}/crop-{1,3,6}.webp, og-{1,3,6}.jpg and ${WORK}/ (master, all crops, overlay)`);
}

/**
 * Records a round of the real game for the landing page. Before running it:
 *
 *   1. an empty database: e.g. `npx @electric-sql/pglite-socket --port 54329`,
 *      then `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/postgres npm run db:migrate`
 *   2. a production build with the game on: `NEXT_PUBLIC_GAME_LIVE=true npm run build`
 *   3. the server on that database: `DATABASE_URL=… GUESS_SECRET=… ADMIN_TOKEN=… npm start`
 *   4. `ADMIN_TOKEN=… npm run art:demo -- http://localhost:3000` (after `npm run art:landing`)
 */
async function recordDemo(base: string) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) throw new Error("ADMIN_TOKEN (the local server's) is required");
  const api = async (pathname: string, init: RequestInit = {}) => {
    const res = await fetch(new URL(pathname, base), { ...init, headers: { "x-admin-token": token, ...init.headers } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${pathname}: ${res.status} ${JSON.stringify(body)}`);
    return body;
  };
  const admin = (body: object) =>
    api("/api/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  // The sample puzzle, through the same steps as a real one.
  const { id } = await admin({
    action: "addWatch",
    ...DEMO_WATCH,
    reference: "SD42",
    year: 2026,
    movement: "Automatic",
    priceTier: "mid",
    difficultyWeight: 3,
    specBullets: ["42 mm steel diver", "60-minute rotating bezel", "Five-link bracelet"],
    photoSource: "own",
    modelAliases: ["diver"],
  });
  const form = new FormData();
  form.set("watchId", String(id));
  form.set("file", new Blob([readFileSync(path.join(WORK, "demo-master.jpg"))], { type: "image/jpeg" }), "master.jpg");
  await api("/api/admin/master", { method: "POST", body: form });
  await admin({ action: "setCrops", watchId: id, cropSpecs: DEMO_CROPS, logoMasks: DEMO_MASKS });
  await admin({ action: "markQa", watchId: id });
  await admin({ action: "schedule", watchId: id, puzzleDate: todayKey() });
  console.log("sample puzzle scheduled for", todayKey());

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto(new URL("/play", base).toString(), { waitUntil: "networkidle0" });
    await page.waitForSelector('img[alt^="Watch detail"]');
    const film = new Film(page, path.join(WORK, "frames"));
    await playRound(page, film);
    encode(film.write(path.join(WORK, "demo-raw.mp4")));
  } finally {
    await browser.close();
  }
}

/**
 * Stop-motion recording: a full-resolution screenshot after every change, each
 * held for an exact time, assembled at a steady 30 fps. (Chrome's screencast
 * only sends frames at CSS size, so it would be blurry on a retina screen.)
 */
class Film {
  private frames: { file: string; seconds: number }[] = [];
  constructor(
    private page: Page,
    private dir: string,
  ) {
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
  }

  /** Waits for React to render and the browser to paint, then holds a frame. */
  async shot(seconds: number) {
    await this.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const file = path.join(this.dir, `${String(this.frames.length).padStart(5, "0")}.png`);
    await this.page.screenshot({ path: file as `${string}.png` });
    this.frames.push({ file: path.resolve(file), seconds });
  }

  async type(selector: string, text: string) {
    await this.page.click(selector);
    for (const ch of text) {
      await this.page.keyboard.type(ch);
      await this.shot(0.11);
    }
  }

  /** Scrolls to the bottom over `seconds`, eased, one frame at a time. */
  async scrollToEnd(seconds: number) {
    const [from, to] = await this.page.evaluate(() => [window.scrollY, document.body.scrollHeight - window.innerHeight]);
    const n = Math.round(seconds * 30);
    for (let i = 1; i <= n; i++) {
      const k = i / n;
      const eased = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      await this.page.evaluate((y) => window.scrollTo(0, y), from + (to - from) * eased);
      await this.shot(1 / 30);
    }
  }

  write(out: string): string {
    const list = this.frames.map((f) => `file '${f.file}'\nduration ${f.seconds.toFixed(4)}`).join("\n");
    const listFile = path.join(this.dir, "list.txt");
    // The concat format wants the last file repeated after its duration.
    writeFileSync(listFile, `${list}\nfile '${this.frames.at(-1)!.file}'\n`);
    execFileSync("ffmpeg", [
      "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", listFile,
      "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-crf", "14", "-preset", "fast", out,
    ]);
    console.log(`filmed ${this.frames.length} frames`);
    return out;
  }
}

const cropShown = (page: Page, n: number) =>
  page.waitForFunction((n) => {
    const img = document.querySelector<HTMLImageElement>('img[alt^="Watch detail"]');
    return document.body.innerText.includes(`crop ${n} / 6`) && !!img?.complete && img.naturalWidth > 0;
  }, {}, n);

/** Two wrong brands, the right one, then the model: solved on crop 3. */
async function playRound(page: Page, film: Film) {
  const box = 'input[role="combobox"]';
  const guess = async (text: string) => {
    await film.type(box, text);
    await film.shot(0.4);
    await page.keyboard.press("Enter");
  };
  await film.shot(1.8);
  await guess("Omega");
  await cropShown(page, 2);
  await film.shot(1.6);
  await guess("Tudor");
  await cropShown(page, 3);
  await film.shot(1.6);
  await guess("Sela");
  await page.waitForFunction(() => document.body.innerText.includes("Now the model"));
  await film.shot(1.3);
  await guess("Diver 42");
  await page.waitForFunction(() => {
    const img = document.querySelector<HTMLImageElement>("img");
    return /Solved on crop/.test(document.body.innerText) && !!img?.complete;
  });
  await film.shot(2.4);
  await film.scrollToEnd(0.9);
  await film.shot(2.6);
}

/** mp4 (H.264) and webm (VP9), a short fade at each end so the loop is smooth, and a poster frame. */
function encode(raw: string) {
  const dur = Number(
    execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", raw]).toString().trim(),
  );
  if (!Number.isFinite(dur)) throw new Error(`couldn't read the duration of ${raw}`);
  const vf = `fps=30,fade=t=in:st=0:d=0.4,fade=t=out:st=${(dur - 0.5).toFixed(2)}:d=0.5`;
  const ff = (...args: string[]) => execFileSync("ffmpeg", ["-y", "-v", "error", "-i", raw, "-vf", vf, "-an", ...args]);
  ff("-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "27", "-preset", "slow", "-movflags", "+faststart", path.join(OUT, "demo.mp4"));
  ff("-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "40", "-row-mt", "1", path.join(OUT, "demo.webm"));
  const poster = path.join(WORK, "poster.png");
  execFileSync("ffmpeg", ["-y", "-v", "error", "-ss", "1.2", "-i", raw, "-frames:v", "1", poster]);
  execFileSync("node", ["-e", `require("sharp")(${JSON.stringify(poster)}).webp({quality:80}).toFile(${JSON.stringify(path.join(OUT, "demo-poster.webp"))})`]);
  rmSync(poster);
  console.log(`wrote ${OUT}/demo.mp4, demo.webm and demo-poster.webp (${dur.toFixed(1)} s)`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, base] = process.argv.slice(2);
  mkdirSync(WORK, { recursive: true });
  if (cmd === "art") {
    await makeArt();
  } else if (cmd === "demo" && base) {
    await recordDemo(base);
  } else {
    throw new Error("usage: landing-art.mts art | demo <base-url>");
  }
}
