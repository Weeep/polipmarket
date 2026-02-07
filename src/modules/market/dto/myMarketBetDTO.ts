export type MyMarketBetDTO = {
  marketId: string;
  question: string;
  closesAt: string;
  resolvesAt?: string | null;
  status: string;
  latestBetAt: string;
  bets: {
    orderId: string;
    outcome: "YES" | "NO";
    amount: number;
    price: number;
    status: string;
    createdAt: string;
  }[];
};
