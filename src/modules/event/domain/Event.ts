import type { MarketSummary } from "@/modules/market/domain/Market";

export type EventCategory = "POLITICS" | "SPORT" | "WORLD" | "OTHER";

export interface Event {
  id: string;
  question: string;
  description?: string | null;
  category: EventCategory;
  bettingCloseAt: Date;
  resolveAt?: Date | null;
  feeBps: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type EventStats = {
  totalBets: number;
  totalVolume: number;
};

export type EventSummary = Event & {
  markets: MarketSummary[];
  eventStats?: EventStats;
};
