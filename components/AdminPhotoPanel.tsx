"use client";

import { useMemo, useState } from "react";

type Rect = { x: number; y: number; w: number; h: number };
type Crop = Rect & { blur: number };

export type PhotoInfo = {
  id: number;
  masterKey: string | null;
  masterSize: { width: number; height: number } | null;
  cropSpecs: Crop[];
  logoMasks: Rect[];
  /** Changes whenever the crops are re-cut; busts the preview cache. */
  cropVersion: string | null;
  scheduled: boolean;
};

const field =
  "rounded border border-white/10 bg-[var(--bg)] px-3 py-2 font-mono text-xs outline-none focus:border-[var(--gold)]";
const button = "rounded bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50";

/** Vercel caps request bodies at 4.5 MB; stay clear of it. */
const MAX_UPLOAD_BYTES = 4_000_000;
const MAX_SIDE = 4096;

/**
 * Re-encodes the chosen photo as JPEG in the browser: keeps it under the
 * upload limit, turns HEIC from a phone into something the server can read,
 * applies the EXIF rotation, and drops the EXIF itself (camera, location).
 */
async function toUploadJpeg(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This browser can't read that photo. Export it as JPEG or PNG first.");
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.92, 0.85, 0.75, 0.65]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (blob && blob.size <= MAX_UPLOAD_BYTES) return blob;
  }
  throw new Error("Couldn't get this photo under 4 MB.");
}

/** One rectangle per line, keys in x, y, w, h(, blur) order (jsonb sorts them otherwise). */
const pretty = (rects: (Rect & { blur?: number })[]) =>
  `[\n${rects
    .map(({ x, y, w, h, blur }) => `  ${JSON.stringify(blur === undefined ? { x, y, w, h } : { x, y, w, h, blur })}`)
    .join(",\n")}\n]`;

function parseRects<T>(raw: string): T[] | null {
  try {
    const v = JSON.parse(raw.trim() || "[]");
    return Array.isArray(v) ? (v as T[]) : null;
  } catch {
    return null;
  }
}

export function PhotoPanel({
  watch,
  token,
  busy,
  onSaveCrops,
  onMessage,
}: {
  watch: PhotoInfo;
  token: string;
  busy: boolean;
  onSaveCrops: (watchId: number, cropSpecs: Crop[], logoMasks: Rect[]) => void;
  onMessage: (ok: boolean, text: string) => void;
}) {
  const [cropsText, setCropsText] = useState(pretty(watch.cropSpecs));
  const [masksText, setMasksText] = useState(pretty(watch.logoMasks));
  const [uploading, setUploading] = useState(false);
  const crops = useMemo(() => parseRects<Crop>(cropsText), [cropsText]);
  const masks = useMemo(() => parseRects<Rect>(masksText), [masksText]);
  const photo = (file: string, v: string | null) =>
    `/api/admin/photo/${watch.id}/${file}?token=${encodeURIComponent(token)}&v=${encodeURIComponent(v ?? "")}`;

  async function upload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.set("watchId", String(watch.id));
      form.set("file", await toUploadJpeg(file), "master.jpg");
      const res = await fetch("/api/admin/master", { method: "POST", headers: { "x-admin-token": token }, body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error([data.error ?? `error ${res.status}`, ...(data.problems ?? [])].join("\n• "));
      onMessage(true, `Uploaded (${data.width}×${data.height}) and cut default crops. Adjust them, then check for logos.`);
      setTimeout(() => location.reload(), 900);
    } catch (err) {
      onMessage(false, err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function save() {
    if (!crops || !masks) return onMessage(false, "Crops and masks must be JSON arrays of rectangles.");
    onSaveCrops(watch.id, crops, masks);
  }

  if (watch.scheduled) {
    return (
      <p className="mt-3 text-xs text-[var(--muted)]">
        Scheduled, so its photo and crops are frozen. Unschedule its future day to change them.
      </p>
    );
  }

  const size = watch.masterSize;
  return (
    <div className="mt-3 flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--muted)]">
          {watch.masterKey ? "Replace the master photo (resets crops, masks and the logo check)" : "Upload the master photo"}
        </span>
        <input
          type="file"
          accept="image/*"
          disabled={uploading || busy}
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          className="text-sm"
        />
        {uploading && <span className="text-xs text-[var(--gold)]">Uploading and cutting…</span>}
      </label>

      {watch.masterKey && size && (
        <>
          {/* The master with every rectangle drawn on it, live as you edit. */}
          <div className="relative w-full overflow-hidden rounded border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element -- private, token-gated admin image */}
            <img src={photo("master", watch.masterKey)} alt="Master photo" className="block w-full" />
            <svg viewBox={`0 0 ${size.width} ${size.height}`} className="absolute inset-0 h-full w-full">
              {(masks ?? []).map((m, i) => (
                <rect key={`m${i}`} x={m.x} y={m.y} width={m.w} height={m.h} fill="rgba(220,38,38,0.45)" stroke="#dc2626" strokeWidth={size.width / 400} />
              ))}
              {(crops ?? []).map((c, i) => (
                <g key={`c${i}`}>
                  <rect x={c.x} y={c.y} width={c.w} height={c.h} fill="none" stroke="#d4af37" strokeWidth={size.width / 500} />
                  <text x={c.x + size.width / 150} y={c.y + size.width / 40} fill="#d4af37" fontSize={size.width / 45} fontFamily="monospace">
                    {i + 1}
                  </text>
                </g>
              ))}
            </svg>
          </div>
          <p className="text-xs text-[var(--muted)]">
            {size.width}×{size.height}px. Gold: crops 1 (macro) → 6 (whole watch). Red: logo masks, blurred out of
            every crop. Pixel coordinates in the full-size photo.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
              Crop rectangles (6 × {"{x, y, w, h, blur}"})
              <textarea rows={8} wrap="off" value={cropsText} onChange={(e) => setCropsText(e.target.value)} className={field} />
              {!crops && <span className="text-red-400">Not valid JSON.</span>}
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
              Logo masks ({"{x, y, w, h}"}: every logo, wordmark and signed text)
              <textarea rows={8} wrap="off" value={masksText} onChange={(e) => setMasksText(e.target.value)} className={field} />
              {!masks && <span className="text-red-400">Not valid JSON.</span>}
            </label>
          </div>
          <button className={button} disabled={busy || !crops || !masks} onClick={save}>
            Save and re-cut the crops
          </button>
          <p className="text-xs text-[var(--muted)]">Re-cutting clears the logo check: look at the new crops below again.</p>
        </>
      )}

      {watch.cropVersion && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <figure key={i} className="flex flex-col gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element -- private, token-gated admin image */}
              <img src={photo(String(i), watch.cropVersion)} alt={`Crop ${i + 1}`} className="aspect-square w-full rounded border border-white/10" />
              <figcaption className="text-center text-xs text-[var(--muted)]">crop {i + 1}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
