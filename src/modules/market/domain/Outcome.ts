export type OutcomeStatus = "ACTIVE" | "INACTIVE" | "RESOLVED";

export interface Outcome {
  id: string;
  marketId: string;
  slug: string;
  label: string;
  position: number;
  status: OutcomeStatus;
  createdAt: Date;
}

export type OutcomeWithPrices = Outcome & {
  yesPrice?: number;
  noPrice?: number;
};
