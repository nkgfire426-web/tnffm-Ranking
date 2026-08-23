export type RawTeam = {
  teamName: string;
  logoUrl: string;
  kills: number;
  booyahs: number;
  championships: number;
  runnerUp: number;
  secondRunnerUp: number;
  top5Finishes?: number;
  finalistFinishes?: number;
  officialMatchFinalists?: number;
  eventsPlayed?: number;
  grandFinals: number;
  winRate: number;
  killRatio: number;
  booyahRatio?: number;
  positionPoints?: number;
  totalPoints?: number;
  matchesPlayed?: number;
  approvedSubmissionPoints?: number;
  rankingEligible?: boolean;
  registrationStatus?: "Registered" | "Hidden";
  status?: "Active" | "Inactive" | "Banned";
  description?: string;
  bannerUrl?: string;
  players?: number;
  roster?: { name: string; uid: string }[];
  mobileNumber?: string;
};

export type RankedTeam = RawTeam & {
  rank: number;
  previousRank: number;
  communityPoints: number;
  top3Finishes: number;
  slug: string;
  badge: string;
  lastUpdated: string;
};

export type SortKey = keyof Pick<
  RankedTeam,
  | "rank"
  | "teamName"
  | "communityPoints"
  | "championships"
  | "runnerUp"
  | "secondRunnerUp"
  | "top5Finishes"
  | "finalistFinishes"
  | "officialMatchFinalists"
  | "eventsPlayed"
  | "grandFinals"
  | "booyahs"
  | "kills"
  | "winRate"
  | "killRatio"
  | "lastUpdated"
>;
