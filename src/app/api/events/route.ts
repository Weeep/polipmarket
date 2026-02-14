import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import {
  createEventWithMarkets,
  CreateEventWithMarketsInput,
} from "@/modules/event/application/createEventWithMarkets";
import { getEvents } from "@/modules/event/application/getEvents";
import { getMarketsByEventId } from "@/modules/market/application/getMarketsByEventId";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function toCreateEventInput(
  body: Record<string, unknown>,
  userId: string,
): CreateEventWithMarketsInput {
  const bettingCloseValue = body.bettingCloseAt;
  const bettingCloseAt =
    bettingCloseValue instanceof Date
      ? bettingCloseValue
      : new Date(String(bettingCloseValue));
  const resolveAtValue = body.resolveAt;
  const resolveAt =
    resolveAtValue instanceof Date
      ? resolveAtValue
      : resolveAtValue != null
        ? new Date(String(resolveAtValue))
        : null;

  return {
    question: String(body.question ?? ""),
    description: typeof body.description === "string" ? body.description : null,
    bettingCloseAt,
    resolveAt,
    feeBps: typeof body.feeBps === "number" ? body.feeBps : undefined,
    createdBy: userId,
    markets: Array.isArray(body.markets)
      ? body.markets.map((item) => {
          if (!item || typeof item !== "object") {
            throw new Error("Invalid market format");
          }
          const market = item as Record<string, unknown>;
          return {
            name: String(market.name ?? ""),
            description:
              typeof market.description === "string"
                ? market.description
                : null,
          };
        })
      : [],
  };
}

export const POST = withAuth(async (user, req) => {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const result = await createEventWithMarkets(
      toCreateEventInput(body, user.id),
    );

    return NextResponse.json(result.event, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(err, "Bad request") },
      { status: 400 },
    );
  }
});

export async function GET() {
  try {
    const events = await getEvents();

    const eventsWithMarkets = await Promise.all(
      events.map(async (event) => {
        const marketsWithExtras = await getMarketsByEventId(event.id);

        const eventStats = marketsWithExtras.reduce(
          (acc, market) => {
            acc.totalBets +=
              market.marketStats?.totalMarketStats.totalBets ?? 0;
            acc.totalVolume +=
              market.marketStats?.totalMarketStats.totalVolume ?? 0;
            return acc;
          },
          { totalBets: 0, totalVolume: 0 },
        );

        return {
          ...event,
          markets: marketsWithExtras,
          eventStats,
        };
      }),
    );

    return NextResponse.json(eventsWithMarkets);
  } catch (err: unknown) {
    console.error("[GET /api/events]", err);
    return NextResponse.json(
      { error: getErrorMessage(err, "Internal server error") },
      { status: 500 },
    );
  }
}
