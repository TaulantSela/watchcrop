/**
 * Renders landing-page art with Watchcraft (Taulant's own 3D watch configurator,
 * https://watchcraft-app.vercel.app): original, procedurally built watches with
 * no third-party photos or models, so there are no image rights to clear.
 *
 *   npx tsx scripts/render-art.mts <out-dir> [name=query ...]
 *
 * Each `name=query` is a Watchcraft settings query (see its README), rendered
 * on a transparent background to <out-dir>/<name>.png. Needs a local Chrome.
 * WATCHCRAFT_URL points it at a local Watchcraft instead of the live one.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const WATCHCRAFT = process.env.WATCHCRAFT_URL ?? "https://watchcraft-app.vercel.app/";

export async function renderWatch(query: string, out: string, size = { width: 1400, height: 1400, dpr: 2 }) {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--use-angle=metal"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: size.width, height: size.height, deviceScaleFactor: size.dpr });
    await page.goto(`${WATCHCRAFT}?still&${query}`, { waitUntil: "load" });
    await page.waitForFunction(
      () => !!document.querySelector("canvas") && !document.querySelector("[data-loading]") && !document.querySelector("[data-busy]"),
      { timeout: 90_000 },
    );
    await page.addStyleTag({ content: "[data-overlay] { display: none !important; } * { background: transparent !important; }" });
    await new Promise((r) => setTimeout(r, 1200));
    const canvas = await page.$("canvas");
    if (!canvas) throw new Error("no canvas");
    await canvas.screenshot({ path: out as `${string}.png`, omitBackground: true });
  } finally {
    await browser.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [outDir, ...jobs] = process.argv.slice(2);
  if (!outDir || !jobs.length) throw new Error("usage: render-art.mts <out-dir> name=query ...");
  mkdirSync(outDir, { recursive: true });
  for (const job of jobs) {
    const i = job.indexOf("=");
    const name = job.slice(0, i);
    const out = path.join(outDir, `${name}.png`);
    const side = Number(process.env.RENDER_SIZE ?? 1400);
    await renderWatch(job.slice(i + 1), out, { width: side, height: side, dpr: 2 });
    console.log("rendered", out);
  }
}
