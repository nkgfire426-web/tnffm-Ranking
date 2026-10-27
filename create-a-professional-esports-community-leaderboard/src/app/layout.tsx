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
  title: "TNFFI | Tamilnadu Free Fire India Esports",
  description: "Official Tamilnadu Free Fire India Esports platform for rankings, tournament results, teams, achievements and community updates.",
  keywords: ["TNFFI", "Tamilnadu Free Fire India Esports", "Free Fire MAX", "esports", "tournament rankings"],
  manifest: "/site.webmanifest",
  icons: {
    icon: [{ url: siteLogo, type: "image/png", sizes: "any" }],
    shortcut: [{ url: siteLogo, type: "image/png" }],
    apple: [{ url: siteLogo, type: "image/png" }]
  },
  openGraph: {
    title: "TNFFI | Tamilnadu Free Fire India Esports",
    description: "Official TNFFI rankings, tournament results, teams and esports updates.",
    type: "website",
    url: "https://tnffm-ranking.vercel.app",
    images: [{ url: siteLogo, width: 512, height: 512, alt: "TNFFI official logo" }]
  },
  twitter: {
    card: "summary",
    title: "TNFFI | Tamilnadu Free Fire India Esports",
    description: "Official TNFFI rankings, tournament results, teams and esports updates.",
    images: [{ url: siteLogo, alt: "TNFFI official logo" }]
  }
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#050507", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${inter.variable} ${rajdhani.variable}`}><body className="min-h-screen font-sans antialiased safe-top">{children}<Footer /></body></html>;
}
