import { NextResponse } from "next/server";
import { createMarket } from "@/modules/market/application/createMarket";
import { getMarkets } from "@/modules/market/application/getMarkets";

import { marketRepository } from "@/modules/market/infrastructure/marketRepository";
import { withAuth } from "@/lib/withAuth";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export const POST = withAuth(async (user, req) => {
  try {
    const body = await req.json();

    const market = await createMarket(marketRepository, {
      question: body.question,
      description: body.description,
      closeAt: new Date(body.closeAt),
      createdBy: user.id,
    });

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
