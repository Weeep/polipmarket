import { prisma } from "@/lib/prisma";
import { DEFAULT_AMM_FEE_BPS } from "@/config/economy";
import { Event } from "../domain/Event";
import { eventRepository } from "../infrastructure/eventRepository";
import { marketRepository } from "@/modules/market/infrastructure/marketRepository";

export type CreateEventMarketInput = {
  name: string;
  description?: string | null;
};

export type CreateEventWithMarketsInput = {
  question: string;
  description?: string | null;
  bettingCloseAt: Date;
  resolveAt?: Date | null;
  feeBps?: number;
  createdBy: string;
  markets: CreateEventMarketInput[];
};

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

  const feeBps = input.feeBps ?? DEFAULT_AMM_FEE_BPS;
  if (feeBps < 0 || feeBps > 1000) {
    throw new Error("feeBps must be between 0 and 1000");
  }

  const markets = input.markets.map((market) => {
    const name = market.name.trim();
    if (!name) {
      throw new Error("Market name is required");
    }
    const slug = toSlug(name);
    if (!slug) {
      throw new Error("Market name must contain letters or numbers");
    }

    return {
      name,
      description: market.description ?? null,
      slug,
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
          status: "PENDING_APPROVAL",
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
            },
          ],
        },
        tx,
      );
    }

    return { event };
  });
}
