import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { placeOrder } from "@/modules/order/application/placeOrder";
import { OrderPosition } from "@/modules/order/domain/Order";
import { DEFAULT_MAX_SLIPPAGE_BPS } from "@/config/economy";

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
      body.maxSlippageBps == null
        ? DEFAULT_MAX_SLIPPAGE_BPS
        : Number(body.maxSlippageBps);

    if (maxSlippageBps != null && !Number.isFinite(maxSlippageBps)) {
      return NextResponse.json(
        { error: "Invalid maxSlippageBps" },
        { status: 400 },
      );
    }

    if (
      !body.marketId ||
      !body.outcomeId ||
      body.position == null ||
      !Number.isFinite(amount)
    ) {
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
    if (error instanceof Error && error.message === "Invalid position") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("[POST /api/orders]", error);

    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
});
