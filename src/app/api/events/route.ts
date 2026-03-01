import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import {
  createEventWithMarkets,
  CreateEventWithMarketsInput,
} from "@/modules/event/application/createEventWithMarkets";
import { getEvents } from "@/modules/event/application/getEvents";
import { getMarketsByEventId } from "@/modules/market/application/getMarketsByEventId";
import { getSession } from "@/modules/auth/application/getSession";
import { EventCategory } from "@/modules/event/domain/Event";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}


const EVENT_CATEGORIES: EventCategory[] = ["POLITICS", "SPORT", "WORLD", "OTHER"];

function parseEventCategory(value: unknown): EventCategory {
  if (typeof value !== "string") {
    return "POLITICS";
  }

  const normalized = value.trim().toUpperCase();
  if (EVENT_CATEGORIES.includes(normalized as EventCategory)) {
    return normalized as EventCategory;
  }

  throw new Error("Invalid category");
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
    category: parseEventCategory(body.category),
    bettingCloseAt,
    resolveAt,
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
            yesStartPercent:
              typeof market.yesStartPercent === "number"
                ? market.yesStartPercent
                : undefined,
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


function normalizeSearchTerm(value: string | null) {
  return (value ?? "").trim().toLocaleLowerCase();
}

function hasSearchMatch(
  event: { question: string; description?: string | null },
  markets: Array<{
    question: string;
    description?: string | null;
    outcomes?: Array<{ label: string }>;
  }>,
  query: string,
) {
  if (!query) {
    return true;
  }

  const searchableText = [
    event.question,
    event.description ?? "",
    ...markets.flatMap((market) => [
      market.question,
      market.description ?? "",
      ...(market.outcomes?.map((outcome) => outcome.label) ?? []),
    ]),
  ]
    .join(" ")
    .toLocaleLowerCase();

  return searchableText.includes(query);
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
    const query = normalizeSearchTerm(searchParams.get("q"));
    const hasValidQuery = query.length >= 2;
    const category = parseEventCategory(searchParams.get("category"));
    const hasCategoryFilter = searchParams.has("category");
    const [events, session] = await Promise.all([getEvents(), getSession()]);
    const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;

    const sourceEvents = (activeOnly ? events.filter(isActiveEvent) : events).filter((event) =>
      hasCategoryFilter ? event.category === category : true,
    );

    const eventsWithMarkets = await Promise.all(
      sourceEvents.map(async (event) => {
        const marketsWithExtras = await getMarketsByEventId(event.id, userId);

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

        if (hasValidQuery && !hasSearchMatch(event, marketsWithExtras, query)) {
          return null;
        }

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

    if (sort === "created_desc") {
      visibleEvents.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
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
    const message = getErrorMessage(err, "Internal server error");
    if (message === "Invalid category") {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error("[GET /api/events]", err);
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
