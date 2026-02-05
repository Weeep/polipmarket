import {
  AmmCurve,
  Market,
  MarketType,
  OutcomeStatus,
} from "../domain/Market";
import { MarketRepository } from "../infrastructure/marketRepository";

export type CreateMarketOutcomeInput = {
  slug: string;
  label: string;
  position: number;
  status?: OutcomeStatus;
};

export type CreateMarketAmmConfigInput = {
  curve?: AmmCurve;
  feeBps?: number;
  lmsrB?: number | null;
};

export type CreateMarketInput = {
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

  const uniquePositions = new Set(normalized.map((outcome) => outcome.position));
  if (uniquePositions.size !== normalized.length) {
    throw new Error("Outcome positions must be unique within a market");
  }

  if (type === "MULTI_CHOICE" && normalized.length < 2) {
    throw new Error("MULTI_CHOICE market requires at least 2 outcomes");
  }

  if (type === "BINARY" && normalized.length > 2) {
    throw new Error("BINARY market supports at most 2 outcomes");
  }

  return normalized.sort((a, b) => a.position - b.position);
}

function normalizeAmmConfig(
  ammConfig?: CreateMarketAmmConfigInput | null,
): Required<CreateMarketAmmConfigInput> {
  const curve = ammConfig?.curve ?? "CPMM";
  const feeBps = ammConfig?.feeBps ?? 100;
  const lmsrB = ammConfig?.lmsrB ?? null;

  if (feeBps < 0 || feeBps > 1000) {
    throw new Error("feeBps must be between 0 and 1000");
  }

  if (curve === "LMSR" && (lmsrB == null || lmsrB <= 0)) {
    throw new Error("LMSR requires a positive lmsrB");
  }

  return {
    curve,
    feeBps,
    lmsrB,
  };
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
    ammConfig: normalizeAmmConfig(input.ammConfig),
  });
}
