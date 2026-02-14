import { OrderPosition } from "./Order";

export type Position = {
  id: string;
  userId: string;
  marketId: string;
  outcomeId: string;
  position: OrderPosition;
  shares: number;
  costBasis: number;
  createdAt: Date;
  updatedAt: Date;
};
