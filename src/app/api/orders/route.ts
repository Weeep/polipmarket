import { NextRequest, NextResponse } from "next/server";
import { placeOrder } from "@/modules/order/application/placeOrder";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";

export const POST = withAuth<{ params: Promise<{ id: string }> }>(
  async (user, _req, { params }) => {
    try {
      const body = await _req.json();
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
    } catch (error: any) {
      console.error("[POST /api/orders]", error);

      return NextResponse.json(
        { error: error.message ?? "Internal server error" },
        { status: 500 },
      );
    }
  },
);
