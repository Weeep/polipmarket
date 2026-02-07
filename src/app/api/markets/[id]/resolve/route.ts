import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { resolveMarket } from "@/modules/market/application/resolveMarket";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export const POST = withAuth(async (_user, req, context) => {
  try {
    const { params } = context as { params: { id: string } };
    const { id } = params;
    const body = (await req.json()) as { outcomeId?: string; position?: string };
    if (!body.outcomeId) {
      throw new Error("outcomeId is required");
    }

    if (body.position !== "YES" && body.position !== "NO") {
      throw new Error("position must be YES or NO");
    }

    const market = await resolveMarket({
      marketId: id,
      outcomeId: body.outcomeId,
      position: body.position,
    });
    return NextResponse.json(market);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to resolve market") },
      { status: 400 },
    );
  }
});
