import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

const SITE = process.env.NEXT_PUBLIC_SITE_NAME ?? "WatchCrop";

export const alt = `${SITE}: a daily guess-the-watch game`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The link preview for every page (Reddit, forums, chats): the landing strip,
 * crops 1, 3 and 6 of a sample watch, zooming out left to right. An original
 * Watchcraft render (scripts/landing-art.mts), never a real watch photo.
 */
export default async function Image() {
  const crops = await Promise.all(
    [1, 3, 6].map(async (n) => {
      const jpg = await readFile(path.join(process.cwd(), "public/landing", `og-${n}.jpg`));
      return `data:image/jpeg;base64,${jpg.toString("base64")}`;
    }),
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 80px",
          background: "#07080c",
          color: "#e7e9ee",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", gap: 24 }}>
          {crops.map((src, i) => (
            <img key={i} src={src} alt="" width={220} height={220} style={{ borderRadius: 20 }} />
          ))}
        </div>
        <div style={{ fontSize: 30, color: "#c9a24b", marginTop: 40 }}>{SITE}</div>
        <div style={{ fontSize: 72, fontWeight: 800, marginTop: 4 }}>Can you name the watch?</div>
        <div style={{ fontSize: 32, color: "#8b93a7", marginTop: 12 }}>
          One watch a day. Logos hidden. Zoom out until you crack it.
        </div>
      </div>
    ),
    size,
  );
}
