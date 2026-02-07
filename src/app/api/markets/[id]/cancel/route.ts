import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { cancelMarket } from "@/modules/market/application/cancelMarket";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export const POST = withAuth(async (_user, _req, context) => {
  try {
    const { id } = context as { params: { id: string } };
    const market = await cancelMarket(id);
    return NextResponse.json(market);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to cancel market") },
      { status: 400 },
    );
  }
});
