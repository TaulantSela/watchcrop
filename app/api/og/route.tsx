import { ImageResponse } from "next/og";

const SITE = process.env.NEXT_PUBLIC_SITE_NAME ?? "WatchCrop";

/**
 * Rich social-preview card (PNG) for shared results. Spoiler-free by design:
 * it shows the grid + result, NEVER the watch. Use as og:image on share URLs.
 *   /api/og?n=142&result=3/6&streak=24
 */
export function GET(req: Request) {
  const u = new URL(req.url);
  const n = u.searchParams.get("n") ?? "—";
  const result = u.searchParams.get("result") ?? "X/6";
  const streak = u.searchParams.get("streak") ?? "0";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "#07080c",
          color: "#e7e9ee",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 40, color: "#c9a24b", fontWeight: 700 }}>{SITE}</div>
        <div style={{ fontSize: 90, fontWeight: 800, marginTop: 12 }}>#{n}</div>
        <div style={{ fontSize: 56, marginTop: 8 }}>solved {result}</div>
        <div style={{ fontSize: 32, color: "#8b93a7", marginTop: 16 }}>🔥 streak {streak}</div>
        <div style={{ fontSize: 26, color: "#8b93a7", marginTop: 40 }}>name the watch · daily</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
