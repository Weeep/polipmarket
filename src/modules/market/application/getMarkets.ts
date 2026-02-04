import { Market } from "../domain/Market";
import { MarketRepository } from "../infrastructure/marketRepository";

export async function getMarkets(repo: MarketRepository): Promise<Market[]> {
  return repo.findAll();
}

export async function getMarketById(
  repo: MarketRepository,
  id: string,
): Promise<Market | null> {
  if (!id) return null;
  return repo.findById(id);
}
