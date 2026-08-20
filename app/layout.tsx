import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PING",
  description:
    "Find the hidden signal on a 12×12 grid in 4 taps — tap a cell and you get a number; 0 wins.",
  openGraph: {
    title: "PING",
    description:
      "Find the hidden signal on a 12×12 grid in 4 taps — tap a cell and you get a number; 0 wins.",
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
