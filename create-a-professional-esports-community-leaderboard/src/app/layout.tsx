import type { Metadata, Viewport } from "next";
import type React from "react";
import { Inter, Rajdhani } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/Footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const rajdhani = Rajdhani({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-rajdhani" });

export const metadata: Metadata = {
  title: "TNFFM | TamilNadu Free Fire Max Esports Official",
  description: "Official TamilNadu Free Fire Max Esports platform for rankings, tournament results, teams, achievements and community updates.",
  keywords: ["TNFFM", "TamilNadu Free Fire Max Esports", "Free Fire MAX", "esports", "tournament rankings"],
  manifest: "/site.webmanifest",
  openGraph: { title: "TNFFM | TamilNadu Free Fire Max Esports Official", description: "Official TNFFM rankings, tournament results, teams and esports updates.", type: "website" }
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#050507", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${inter.variable} ${rajdhani.variable}`}><body className="min-h-screen font-sans antialiased safe-top">{children}<Footer /></body></html>;
}
