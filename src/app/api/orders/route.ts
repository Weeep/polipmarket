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
    const body = (await req.json()) as Record<string, unknown>;
    const amount = Number(body.amount);
    const maxSlippageBps =
      body.maxSlippageBps == null ? undefined : Number(body.maxSlippageBps);

    if (!body.marketId || !body.outcomeId || !Number.isFinite(amount)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const order = await placeOrder({
      userId: user.id,
      marketId: String(body.marketId),
      outcomeId: String(body.outcomeId),
      side: "BUY",
      position: parsePosition(body.position),
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
