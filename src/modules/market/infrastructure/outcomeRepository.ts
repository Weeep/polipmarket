import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { Outcome, OutcomeStatus } from "../domain/Market";

type CreateOutcomeInput = {
  marketId: string;
  slug: string;
  label: string;
  position: number;
  status?: OutcomeStatus;
};

type OutcomeRecord = {
  id: string;
  marketId: string;
  slug: string;
  label: string;
  position: number;
  status: string;
  createdAt: Date;
};

function parseOutcomeStatus(status: string): OutcomeStatus {
  if (status === "ACTIVE" || status === "INACTIVE" || status === "RESOLVED") {
    return status;
  }

  throw new Error(`Invalid outcome status: ${status}`);
}

function toDomain(outcome: OutcomeRecord): Outcome {
  return {
    ...outcome,
    status: parseOutcomeStatus(outcome.status),
  };
}

export type OutcomeRepository = {
  findById(id: string, tx?: Prisma.TransactionClient): Promise<Outcome | null>;
  findByMarketId(
    marketId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Outcome[]>;
  ensureBelongsToMarket(
    marketId: string,
    outcomeId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Outcome>;
  createMany(inputs: CreateOutcomeInput[], tx?: Prisma.TransactionClient): Promise<Outcome[]>;
};

export const outcomeRepository: OutcomeRepository = {
  async findById(id, tx) {
    const client = tx ?? prisma;
    const result = await client.outcome.findUnique({ where: { id } });
    return result ? toDomain(result) : null;
  },

  async findByMarketId(marketId, tx) {
    const client = tx ?? prisma;
    const outcomes = await client.outcome.findMany({
      where: { marketId },
      orderBy: { position: "asc" },
    });

    return outcomes.map(toDomain);
  },

  async ensureBelongsToMarket(marketId, outcomeId, tx) {
    const client = tx ?? prisma;
    const outcome = await client.outcome.findFirst({
      where: {
        id: outcomeId,
        marketId,
      },
    });

    if (!outcome) {
      throw new Error("Invalid outcomeId for market");
    }

    return toDomain(outcome);
  },

  async createMany(inputs, tx) {
    if (inputs.length === 0) {
      return [];
    }

    const client = tx ?? prisma;

    await client.outcome.createMany({
      data: inputs.map((input) => ({
        marketId: input.marketId,
        slug: input.slug,
        label: input.label,
        position: input.position,
        status: input.status ?? "ACTIVE",
      })),
    });

    const created = await client.outcome.findMany({
      where: {
        marketId: inputs[0].marketId,
        slug: {
          in: inputs.map((input) => input.slug),
        },
      },
      orderBy: { position: "asc" },
    });

    return created.map(toDomain);
  },
};
