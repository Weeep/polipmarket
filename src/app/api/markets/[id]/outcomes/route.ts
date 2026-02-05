import { NextResponse } from "next/server";
import { outcomeRepository } from "@/modules/market/infrastructure/outcomeRepository";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const outcomes = await outcomeRepository.findByMarketId(id);

    return NextResponse.json(outcomes);
  } catch (error: unknown) {
    console.error("[GET /api/markets/[id]/outcomes]", error);

    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
