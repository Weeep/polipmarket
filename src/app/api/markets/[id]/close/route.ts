import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { closeMarket } from "@/modules/market/application/closeMarket";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export const POST = withAuth(async (_user, _req, context) => {
  try {
    const { params } = context as { params: { id: string } };
    const { id } = params;
    const market = await closeMarket(id);
    return NextResponse.json(market);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to close market") },
      { status: 400 },
    );
  }
});
