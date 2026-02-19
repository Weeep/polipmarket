import { prisma } from "@/lib/prisma";
import { DEFAULT_AMM_FEE_BPS, DEFAULT_OUTCOME_POOL } from "@/config/economy";
import { Event } from "../domain/Event";
import { eventRepository } from "../infrastructure/eventRepository";
import { marketRepository } from "@/modules/market/infrastructure/marketRepository";
import { MarketStatus } from "@/modules/market/domain/Market";

export type CreateEventMarketInput = {
  name: string;
  description?: string | null;
  yesStartPercent?: number;
};

export type CreateEventWithMarketsInput = {
  question: string;
  description?: string | null;
  bettingCloseAt: Date;
  resolveAt?: Date | null;
  createdBy: string;
  markets: CreateEventMarketInput[];
  initialMarketStatus?: MarketStatus;
};

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeYesStartPercent(value?: number) {
  if (value == null) {
    return 50;
  }

  if (value < 3 || value > 97) {
    throw new Error("yesStartPercent must be between 3 and 97");
  }

  return value;
}

export async function createEventWithMarkets(
  input: CreateEventWithMarketsInput,
): Promise<{ event: Event }> {
  if (!input.question.trim()) {
    throw new Error("Question is required");
  }

  if (input.bettingCloseAt <= new Date()) {
    throw new Error("bettingCloseAt must be in the future");
  }

  if (input.resolveAt && input.resolveAt <= input.bettingCloseAt) {
    throw new Error("resolveAt must be after bettingCloseAt");
  }

  if (!input.markets || input.markets.length === 0) {
    throw new Error("At least one market is required");
  }

  const feeBps = DEFAULT_AMM_FEE_BPS;
  if (feeBps < 0 || feeBps > 10_000) {
    throw new Error("feeBps must be between 0 and 10000");
  }

  const initialMarketStatus = input.initialMarketStatus ?? "PENDING_APPROVAL";
  if (
    initialMarketStatus !== "PENDING_APPROVAL" &&
    initialMarketStatus !== "OPEN"
  ) {
    throw new Error("initialMarketStatus must be PENDING_APPROVAL or OPEN");
  }

  const totalPool = DEFAULT_OUTCOME_POOL * 2;

  const markets = input.markets.map((market) => {
    const name = market.name.trim();
    if (!name) {
      throw new Error("Market name is required");
    }
    const slug = toSlug(name);
    if (!slug) {
      throw new Error("Market name must contain letters or numbers");
    }

    const yesStartPercent = normalizeYesStartPercent(market.yesStartPercent);
    const yesPool = Math.round((totalPool * yesStartPercent) / 100);
    const noPool = totalPool - yesPool;

    return {
      name,
      description: market.description ?? null,
      slug,
      yesPool,
      noPool,
    };
  });

  return prisma.$transaction(async (tx) => {
    const event = await eventRepository.create(
      {
        question: input.question.trim(),
        description: input.description ?? null,
        bettingCloseAt: input.bettingCloseAt,
        resolveAt: input.resolveAt ?? null,
        createdBy: input.createdBy,
        feeBps,
      },
      tx,
    );

    for (const market of markets) {
      await marketRepository.create(
        {
          eventId: event.id,
          question: market.name,
          description: market.description,
          status: initialMarketStatus,
          type: "BINARY",
          bettingCloseAt: input.bettingCloseAt,
          resolveAt: input.resolveAt ?? input.bettingCloseAt,
          createdBy: input.createdBy,
          ammConfig: {
            feeBps,
          },
          outcomes: [
            {
              slug: market.slug,
              label: market.name,
              position: 0,
              status: "ACTIVE",
              liquidity: {
                yesPool: market.yesPool,
                noPool: market.noPool,
              },
            },
          ],
        },
        tx,
      );
    }

    return { event };
  });
}
