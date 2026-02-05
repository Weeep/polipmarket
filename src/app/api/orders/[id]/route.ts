import { NextResponse } from "next/server";
import { cancelOrder } from "@/modules/order/application/cancelOrder";
import { withAuth } from "@/lib/withAuth";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export const DELETE = withAuth<{ params: Promise<{ id: string }> }>(
  async (user, _req, { params }) => {
    try {
      const { id } = await params;

      const order = await cancelOrder({
        orderId: id,
        userId: user.id,
      });

      return NextResponse.json(order);
    } catch (error: unknown) {
      return NextResponse.json(
        { error: getErrorMessage(error, "Internal server error") },
        { status: 400 },
      );
    }
  },
);
