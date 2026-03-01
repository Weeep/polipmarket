import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/modules/auth/application/getSession";
import { getMarketsByEventId } from "@/modules/market/application/getMarketsByEventId";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;

    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const marketsWithExtras = await getMarketsByEventId(event.id, userId);

    const eventStats = marketsWithExtras.reduce<{
      totalBets: number;
      totalVolume: number;
    }>(
      (
        acc: { totalBets: number; totalVolume: number },
        market: (typeof marketsWithExtras)[number],
      ) => {
        acc.totalBets += market.marketStats?.totalMarketStats.totalBets ?? 0;
        acc.totalVolume +=
          market.marketStats?.totalMarketStats.totalVolume ?? 0;
        return acc;
      },
      { totalBets: 0, totalVolume: 0 },
    );

    return NextResponse.json({
      ...event,
      markets: marketsWithExtras,
      eventStats,
    });
  } catch (err: unknown) {
    console.error("[GET /api/events/:id]", err);
    return NextResponse.json(
      { error: getErrorMessage(err, "Internal server error") },
      { status: 500 },
    );
  }
}
