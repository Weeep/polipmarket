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

function isActiveEvent(event: {
  bettingCloseAt: Date;
  resolveAt?: Date | null;
}) {
  const now = Date.now();
  const bettingCloseAt = new Date(event.bettingCloseAt).getTime();
  const resolveAt = event.resolveAt
    ? new Date(event.resolveAt).getTime()
    : null;

  return bettingCloseAt > now && (resolveAt == null || resolveAt > now);
}

function toComparableDate(value?: Date | null) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  return new Date(value).getTime();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sort = searchParams.get("sort");
    const activeOnly = searchParams.get("activeOnly") === "true";
    const limit = Number(searchParams.get("limit") ?? "0");
    const events = await getEvents();

    const sourceEvents = activeOnly ? events.filter(isActiveEvent) : events;

    const eventsWithMarkets = await Promise.all(
      sourceEvents.map(async (event) => {
        const marketsWithExtras = await getMarketsByEventId(event.id);

        if (marketsWithExtras.length === 0) {
          return null;
        }

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

    const visibleEvents = eventsWithMarkets.filter(
      (event): event is NonNullable<(typeof eventsWithMarkets)[number]> =>
        event !== null &&
        event.markets?.some((m) => m?.status === "OPEN") === true,
    );

    if (sort === "volume_desc") {
      visibleEvents.sort(
        (a, b) =>
          (b.eventStats?.totalVolume ?? 0) - (a.eventStats?.totalVolume ?? 0),
      );
    }

    if (sort === "betting_close_asc") {
      visibleEvents.sort(
        (a, b) =>
          toComparableDate(a.bettingCloseAt) -
          toComparableDate(b.bettingCloseAt),
      );
    }

    if (sort === "event_close_asc") {
      visibleEvents.sort(
        (a, b) => toComparableDate(a.resolveAt) - toComparableDate(b.resolveAt),
      );
    }

    const limitedEvents =
      Number.isFinite(limit) && limit > 0
        ? visibleEvents.slice(0, Math.floor(limit))
        : visibleEvents;

    return NextResponse.json(limitedEvents);
  } catch (err: unknown) {
    console.error("[GET /api/events]", err);
    return NextResponse.json(
      { error: getErrorMessage(err, "Internal server error") },
      { status: 500 },
    );
  }
}
