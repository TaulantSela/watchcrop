import { ImageResponse } from "next/og";
import { placeholderCropSvg, seedFrom } from "@/lib/cropImage";

const SITE = process.env.NEXT_PUBLIC_SITE_NAME ?? "WatchCrop";

export const alt = `${SITE}: a daily guess-the-watch game`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The link preview for every page (Reddit, forums, chats): the landing teaser
 * strip, zooming out left to right. Generated demo art only, never a real
 * watch photo.
 */
export default function Image() {
  const crop = (i: number) =>
    `data:image/svg+xml;base64,${Buffer.from(placeholderCropSvg(seedFrom("teaser"), i)).toString("base64")}`;

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
          {[0, 2, 4].map((i) => (
            <img key={i} src={crop(i)} alt="" width={220} height={220} style={{ borderRadius: 20 }} />
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
