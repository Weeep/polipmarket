import { Market } from "../domain/Market";
import { MarketRepository } from "../infrastructure/marketRepository";

type CreateMarketInput = {
  question: string;
  description?: string | null;
  closeAt: Date;
  createdBy: string;
};

export async function createMarket(
  repo: MarketRepository,
  input: CreateMarketInput,
): Promise<Market> {
  if (!input.question.trim()) {
    throw new Error("Question is required");
  }

  if (input.closeAt <= new Date()) {
    throw new Error("closeAt must be in the future");
  }

  return repo.create({
    question: input.question.trim(),
    description: input.description ?? null,
    status: "OPEN",
    closeAt: input.closeAt,
    createdBy: input.createdBy,
  });
}
