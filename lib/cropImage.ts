import { MAX_CROPS } from "./daily";

/**
 * DEMO placeholder generator. Draws a stylized, logo-free watch as SVG and
 * progressively "zooms out" + de-blurs from crop 0 (extreme macro) to crop 5
 * (whole watch). This lets the game run end-to-end with ZERO real photos —
 * which also means zero image-rights exposure while you validate demand.
 *
 * PRODUCTION: replace this route's body with a fetch of the pre-cut crop from
 * Vercel Blob (cut once from your own master via scripts/cut.ts). The token
 * gating in lib/sign.ts stays exactly the same.
 */

const ZOOM = [3.0, 2.2, 1.6, 1.25, 1.05, 1.0];
const BLUR = [5, 3.5, 2, 1, 0.4, 0];

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

const DIALS = ["#0b1d3a", "#0d3b2e", "#3a0d1d", "#1a1a1a", "#2b2536", "#0f2f3a"];
const BEZELS = ["#c9a24b", "#cfd2d6", "#1c1c1c", "#2e4a8a", "#7a1f2b"];

export function placeholderCropSvg(seed: number, cropIndex: number): string {
  const i = Math.max(0, Math.min(MAX_CROPS - 1, cropIndex));
  const zoom = ZOOM[i];
  const blur = BLUR[i];
  const dial = pick(DIALS, seed);
  const bezel = pick(BEZELS, seed + 2);
  const handAngle = (seed * 37) % 360;

  // Centered zoom transform around the 300,300 midpoint of a 600x600 canvas.
  const tx = 300 - 300 * zoom;
  const ty = 300 - 300 * zoom;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <filter id="b"><feGaussianBlur stdDeviation="${blur}" /></filter>
    <clipPath id="frame"><rect x="0" y="0" width="600" height="600" rx="24" /></clipPath>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="600" height="600" fill="#07080c" />
    <g filter="url(#b)" transform="translate(${tx} ${ty}) scale(${zoom})">
      <!-- bracelet hint -->
      <rect x="255" y="60" width="90" height="120" rx="14" fill="#3a3d44" />
      <rect x="255" y="420" width="90" height="120" rx="14" fill="#3a3d44" />
      <!-- bezel + case -->
      <circle cx="300" cy="300" r="170" fill="${bezel}" />
      <circle cx="300" cy="300" r="150" fill="#16181d" />
      <circle cx="300" cy="300" r="138" fill="${dial}" />
      <!-- crown -->
      <rect x="466" y="288" width="26" height="24" rx="5" fill="${bezel}" />
      <!-- indices -->
      ${indices(dial)}
      <!-- hands -->
      <g transform="rotate(${handAngle} 300 300)">
        <rect x="296" y="190" width="8" height="120" rx="4" fill="#e7e9ee" />
      </g>
      <g transform="rotate(${(handAngle + 120) % 360} 300 300)">
        <rect x="297" y="210" width="6" height="100" rx="3" fill="#e7e9ee" />
      </g>
      <circle cx="300" cy="300" r="9" fill="#e7e9ee" />
      <!-- where the logo would be: kept blank (logo hidden) -->
      <rect x="250" y="225" width="100" height="22" rx="4" fill="${dial}" />
    </g>
  </g>
  <text x="24" y="576" font-family="ui-monospace, monospace" font-size="20" fill="#5a6172">crop ${i + 1} / ${MAX_CROPS} · demo art (logo hidden)</text>
</svg>`;
}

function indices(dial: string): string {
  const parts: string[] = [];
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const x = 300 + Math.sin(a) * 120;
    const y = 300 - Math.cos(a) * 120;
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="#e7e9ee" />`);
  }
  return parts.join("");
}
