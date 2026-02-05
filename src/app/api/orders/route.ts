import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { placeOrder } from "@/modules/order/application/placeOrder";
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

export const POST = withAuth(async (user, req) => {
  try {
    const body = await req.json();
    const { marketId, outcomeId, amount, position, maxSlippageBps } = body;

    if (!marketId || !outcomeId || amount == null || position == null) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const order = await placeOrder({
      userId: user.id,
      marketId,
      outcomeId,
      side: "BUY",
      position: parsePosition(position),
      amount,
      maxSlippageBps,
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error: unknown) {
    console.error("[POST /api/orders]", error);

    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
});
