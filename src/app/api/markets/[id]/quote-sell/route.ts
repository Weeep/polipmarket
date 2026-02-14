import { NextResponse } from "next/server";
import { quoteSell } from "@/modules/order/application/quoteSell";
import { OrderPosition } from "@/modules/order/domain/Order";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function parsePosition(value: unknown): OrderPosition {
  if (value === "YES" || value === "NO") {
    return value;
  }

  throw new Error("Invalid position");
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;

    const outcomeId = String(body.outcomeId ?? "");
    const shares = Number(body.shares);

    if (!outcomeId || body.position == null || !Number.isFinite(shares)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const quote = await quoteSell({
      marketId: id,
      outcomeId,
      position: parsePosition(body.position),
      shares,
    });

    return NextResponse.json(quote, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Invalid position") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("[POST /api/markets/[id]/quote-sell]", error);

    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
