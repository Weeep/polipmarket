import {
  AmmCurve,
  Market,
  MarketType,
  OutcomeStatus,
} from "../domain/Market";
import { MarketRepository } from "../infrastructure/marketRepository";

type CreateMarketOutcomeInput = {
  slug: string;
  label: string;
  position: number;
  status?: OutcomeStatus;
};

type CreateMarketAmmConfigInput = {
  curve?: AmmCurve;
  feeBps?: number;
  lmsrB?: number | null;
};

type CreateMarketInput = {
  question: string;
  description?: string | null;
  closeAt: Date;
  createdBy: string;
  type?: MarketType;
  outcomes?: CreateMarketOutcomeInput[];
  ammConfig?: CreateMarketAmmConfigInput | null;
};

function normalizeOutcomes(
  type: MarketType,
  outcomes?: CreateMarketOutcomeInput[],
): CreateMarketOutcomeInput[] {
  if (!outcomes || outcomes.length === 0) {
    return [
      {
        slug: "default",
        label: "Default outcome",
        position: 0,
        status: "ACTIVE",
      },
    ];
  }

  const normalized = outcomes.map((outcome, index) => ({
    slug: outcome.slug.trim(),
    label: outcome.label.trim(),
    position: Number.isFinite(outcome.position) ? outcome.position : index,
    status: outcome.status ?? "ACTIVE",
  }));

  if (normalized.some((outcome) => !outcome.slug || !outcome.label)) {
    throw new Error("Each outcome must have a slug and label");
  }

  const uniqueSlugs = new Set(normalized.map((outcome) => outcome.slug));
  if (uniqueSlugs.size !== normalized.length) {
    throw new Error("Outcome slugs must be unique within a market");
  }

  if (type === "MULTI_CHOICE" && normalized.length < 2) {
    throw new Error("MULTI_CHOICE market requires at least 2 outcomes");
  }

  return normalized;
}

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

  const type = input.type ?? "BINARY";

  return repo.create({
    question: input.question.trim(),
    description: input.description ?? null,
    status: "OPEN",
    type,
    closeAt: input.closeAt,
    createdBy: input.createdBy,
    outcomes: normalizeOutcomes(type, input.outcomes),
    ammConfig: input.ammConfig ?? {
      curve: "CPMM",
      feeBps: 100,
      lmsrB: null,
    },
  });
}
