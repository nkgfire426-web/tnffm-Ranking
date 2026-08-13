import type { Metadata } from "next";
import type React from "react";
import { Inter, Rajdhani } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/Footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const rajdhani = Rajdhani({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-rajdhani" });

export const metadata: Metadata = {
  title: "TNFFM Community Rankings | Free Fire MAX Esports Leaderboard",
  description: "Professional community leaderboard for Tamilnadu Free Fire Max Esports teams, rankings, points, tournament history, and team profiles.",
  keywords: ["TNFFM", "Tamilnadu Free Fire Max Esports", "Free Fire MAX", "community rankings", "esports leaderboard", "tournament rankings"],
  manifest: "/site.webmanifest",
  openGraph: {
    title: "TNFFM Community Rankings",
    description: "Live Free Fire MAX community rankings for Tamilnadu Free Fire Max Esports.",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${rajdhani.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        {children}
        <Footer />
      </body>
    </html>
  );
}
