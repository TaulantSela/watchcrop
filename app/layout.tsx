import type { Metadata } from "next";
import "./globals.css";

const SITE = process.env.NEXT_PUBLIC_SITE_NAME ?? "WatchCrop";

export const metadata: Metadata = {
  title: `${SITE} — name the watch`,
  description: "A daily guess-the-watch game. Logos hidden. Zoom out until you crack it.",
  openGraph: {
    title: `${SITE} — name the watch`,
    description: "A daily guess-the-watch game for people who recognize a watch at a glance.",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
