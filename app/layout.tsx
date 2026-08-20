import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PING",
  description:
    "Find the hidden signal on three daily grids — 4×4, 6×6, then 12×12 — four taps per board; 0 wins.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    title: "PING",
    description:
      "Find the hidden signal on three daily grids — 4×4, 6×6, then 12×12 — four taps per board; 0 wins.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
