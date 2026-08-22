import type { MetadataRoute } from "next";
import { getRankedTeams } from "@/lib/google-sheets";

// Sitemap includes live team slugs, so it must be generated dynamically.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tnffm-community-rankings.vercel.app";
  const teams = await getRankedTeams();

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/rank-system`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/rules`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/tracked-events`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    ...teams.map((team) => ({
      url: `${baseUrl}/teams/${team.slug}`,
      lastModified: new Date(team.lastUpdated),
      changeFrequency: "daily" as const,
      priority: 0.8
    }))
  ];
}
