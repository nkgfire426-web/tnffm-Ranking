import type { Metadata, Viewport } from "next";
import type React from "react";
import { Inter, Rajdhani } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/Footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const rajdhani = Rajdhani({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-rajdhani" });

const siteLogo = "/brand/tnffm-logo.png";

export const metadata: Metadata = {
  metadataBase: new URL("https://tnffm-ranking.vercel.app"),
  title: "TNFFM | TamilNadu Free Fire Max Esports Official",
  description: "Official TamilNadu Free Fire Max Esports platform for rankings, tournament results, teams, achievements and community updates.",
  keywords: ["TNFFM", "TamilNadu Free Fire Max Esports", "Free Fire MAX", "esports", "tournament rankings"],
  manifest: "/site.webmanifest",
  icons: {
    icon: [{ url: siteLogo, type: "image/png", sizes: "any" }],
    shortcut: [{ url: siteLogo, type: "image/png" }],
    apple: [{ url: siteLogo, type: "image/png" }]
  },
  openGraph: {
    title: "TNFFM | TamilNadu Free Fire Max Esports Official",
    description: "Official TNFFM rankings, tournament results, teams and esports updates.",
    type: "website",
    url: "https://tnffm-ranking.vercel.app",
    images: [{ url: siteLogo, width: 512, height: 512, alt: "TNFFM official logo" }]
  },
  twitter: {
    card: "summary",
    title: "TNFFM | TamilNadu Free Fire Max Esports Official",
    description: "Official TNFFM rankings, tournament results, teams and esports updates.",
    images: [{ url: siteLogo, alt: "TNFFM official logo" }]
  }
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#050507", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${inter.variable} ${rajdhani.variable}`}><body className="min-h-screen font-sans antialiased safe-top">{children}<Footer /></body></html>;
}
