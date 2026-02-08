export type MyMarketBetDTO = {
  marketId: string;
  question: string;
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
  }[];
};
