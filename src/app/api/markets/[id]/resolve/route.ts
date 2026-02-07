import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { resolveMarket } from "@/modules/market/application/resolveMarket";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export const POST = withAuth(async (_user, _req, context) => {
  try {
    const { params } = context as { params: { id: string } };
    const { id } = params;
    const market = await resolveMarket(id);
    return NextResponse.json(market);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to resolve market") },
      { status: 400 },
    );
  }
});
