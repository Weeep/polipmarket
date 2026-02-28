import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { placeOrder } from "@/modules/order/application/placeOrder";
import { OrderPosition, OrderSide } from "@/modules/order/domain/Order";
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

function parseSide(value: unknown): OrderSide {
  if (value == null) {
    return "BUY";
  }

  if (value === "BUY" || value === "SELL") {
    return value;
  }

  throw new Error("Invalid side");
}

export const POST = withAuth(async (user, req) => {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const side = parseSide(body.side);
    const amount = Number(body.amount);
    const shares = Number(body.shares);

    const maxSlippageBps =
      body.maxSlippageBps === null
        ? undefined
        : body.maxSlippageBps == null
          ? DEFAULT_MAX_SLIPPAGE_BPS
          : Number(body.maxSlippageBps);

    if (maxSlippageBps != null && !Number.isFinite(maxSlippageBps)) {
      return NextResponse.json(
        { error: "Invalid maxSlippageBps" },
        { status: 400 },
      );
    }

    if (!body.marketId || !body.outcomeId || body.position == null) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (side === "BUY" && !Number.isFinite(amount)) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (side === "SELL" && !Number.isFinite(shares)) {
      return NextResponse.json({ error: "Invalid shares" }, { status: 400 });
    }

    const order =
      side === "BUY"
        ? await placeOrder({
            userId: user.id,
            marketId: String(body.marketId),
            outcomeId: String(body.outcomeId),
            side,
            position: parsePosition(body.position),
            amount,
            maxSlippageBps,
          })
        : await placeOrder({
            userId: user.id,
            marketId: String(body.marketId),
            outcomeId: String(body.outcomeId),
            side,
            position: parsePosition(body.position),
            shares,
            lotId: body.lotId == null ? undefined : String(body.lotId),
            maxSlippageBps,
          });

    return NextResponse.json(order, { status: 201 });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === "Invalid position" || error.message === "Invalid side")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("[POST /api/orders]", error);

    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
});
