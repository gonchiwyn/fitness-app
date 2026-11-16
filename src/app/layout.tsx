import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face — Instrument Serif. Single light 400 weight with delicate
// forms (Linear / Clay / Sierra AI). Replaces Fraunces, which read too
// editorial / bookish. We use it for marquee moments (page titles, headline
// greetings, big KPI numbers) and keep everything else Geist.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

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
  themeColor: "#0a0a0b",
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
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-text">
        <main className="flex-1 pb-24 safe-top">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
