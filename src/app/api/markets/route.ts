import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import {
  createMarket,
  CreateMarketInput,
} from "@/modules/market/application/createMarket";
import { getMarkets } from "@/modules/market/application/getMarkets";
import { MarketType } from "@/modules/market/domain/Market";
import { marketRepository } from "@/modules/market/infrastructure/marketRepository";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function parseMarketType(value: unknown): MarketType | undefined {
  if (value == null) {
    return undefined;
  }

  if (value === "BINARY" || value === "MULTI_CHOICE") {
    return value;
  }

  throw new Error("Invalid market type");
}

function toCreateMarketInput(body: Record<string, unknown>, userId: string): CreateMarketInput {
  const closeAtValue = body.closeAt;
  const closeAt = closeAtValue instanceof Date ? closeAtValue : new Date(String(closeAtValue));

  return {
    question: String(body.question ?? ""),
    description: typeof body.description === "string" ? body.description : null,
    closeAt,
    createdBy: userId,
    type: parseMarketType(body.type),
    outcomes: Array.isArray(body.outcomes)
      ? body.outcomes.map((item, index) => {
          if (!item || typeof item !== "object") {
            throw new Error("Invalid outcome format");
          }

          const outcome = item as Record<string, unknown>;
          return {
            slug: String(outcome.slug ?? "").trim(),
            label: String(outcome.label ?? "").trim(),
            position:
              typeof outcome.position === "number" ? outcome.position : index,
            status:
              outcome.status === "ACTIVE" ||
              outcome.status === "INACTIVE" ||
              outcome.status === "RESOLVED"
                ? outcome.status
                : undefined,
          };
        })
      : undefined,
    ammConfig:
      body.ammConfig && typeof body.ammConfig === "object"
        ? {
            curve:
              (body.ammConfig as Record<string, unknown>).curve === "LMSR"
                ? "LMSR"
                : "CPMM",
            feeBps:
              typeof (body.ammConfig as Record<string, unknown>).feeBps ===
              "number"
                ? ((body.ammConfig as Record<string, unknown>).feeBps as number)
                : undefined,
            lmsrB:
              typeof (body.ammConfig as Record<string, unknown>).lmsrB ===
              "number"
                ? ((body.ammConfig as Record<string, unknown>).lmsrB as number)
                : null,
          }
        : undefined,
  };
}

export const POST = withAuth(async (user, req) => {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    const market = await createMarket(
      marketRepository,
      toCreateMarketInput(body, user.id),
    );

    return NextResponse.json(market, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(err, "Bad request") },
      { status: 400 },
    );
  }
});

export async function GET() {
  try {
    const markets = await getMarkets(marketRepository);
    return NextResponse.json(markets);
  } catch (error: unknown) {
    console.error("[GET /api/markets]", error);

    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
