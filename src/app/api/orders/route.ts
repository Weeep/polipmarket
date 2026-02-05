import { NextResponse } from "next/server";
import { placeOrder } from "@/modules/order/application/placeOrder";
import { withAuth } from "@/lib/withAuth";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export const POST = withAuth(async (user, req) => {
  try {
    const body = await req.json();
    const { marketId, outcomeId, price, amount } = body;

    if (!marketId || !outcomeId || price == null || amount == null) {
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
      price,
      amount,
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
