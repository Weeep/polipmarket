import { NextResponse } from "next/server";
import { cancelOrder } from "@/modules/order/application/cancelOrder";
import { withAuth } from "@/lib/withAuth";

export const DELETE = withAuth<{ params: Promise<{ id: string }> }>(
  async (user, _req, { params }) => {
    try {
      const { id } = await params;

      const order = await cancelOrder({
        orderId: id,
        userId: user.id,
      });

      return NextResponse.json(order);
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message ?? "Internal server error" },
        { status: 400 },
      );
    }
  },
);
