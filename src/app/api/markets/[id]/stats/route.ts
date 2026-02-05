import { getMarketStats } from "@/modules/market/application/getMarketStats";
import { NextResponse } from "next/server";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export const GET = async (
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;

    const stats = await getMarketStats(id);
    return NextResponse.json(stats);
  } catch (error: unknown) {
    console.error("[GET /api/markets/[id]/stats]", error);

    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
};
