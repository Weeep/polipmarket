export type MyEventMarketBetDTO = {
  marketId: string;
  question: string;
  eventId: string;
  eventQuestion: string;
  feeBps: number;
  closesAt: string;
  resolvesAt?: string | null;
  status: string;
  resolvedOutcomeId?: string | null;
  resolvedPosition?: "YES" | "NO" | null;
  latestBetAt: string;
  bets: {
    orderId: string;
    outcomeId: string;
    outcomeLabel: string;
    position: "YES" | "NO";
    amount: number;
    price: number;
    status: string;
    createdAt: string;
    soldAmount?: number;
    soldPrice?: number;
    soldAt?: string;
  }[];
};
