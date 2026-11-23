import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// No separate display face. Geist does everything — we get hierarchy from
// size and tracking, not a second typeface. Tried Fraunces (too editorial)
// then Instrument Serif (too tall / stylized). Linear, Vercel, Clay all
// hold a single sans and let scale do the work.

export const metadata: Metadata = {
  title: "Outwork",
  description: "Outwork yesterday. Daily training tuned to you.",
  applicationName: "Outwork",
  appleWebApp: {
    capable: true,
    title: "Outwork",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  // Per-scheme so the status bar matches before JS runs. The boot script
  // refines this when the user has an explicit choice that differs from OS.
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
    { media: "(prefers-color-scheme: light)", color: "#faf9f6" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Runs before paint so a stored theme is on <html> immediately —
            otherwise every cold load flashes the OS default first. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-text">
        <main className="flex-1 pb-24 safe-top">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
