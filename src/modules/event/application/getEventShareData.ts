import { getCategoryByValue } from "@/modules/event/domain/eventCategoryMeta";

export type EventShareMarketPreview = {
  id: string;
  question: string;
  yesPriceLabel: string;
  noPriceLabel: string;
};

export type EventShareData = {
  id: string;
  question: string;
  description: string;
  categoryLabel: string;
  bettingCloseLabel: string;
  marketPreviews: EventShareMarketPreview[];
};

const DEFAULT_DESCRIPTION =
  "Fogadj a jövőre közösségi előrejelző piacon a Polipmarketen.";

type PreviewMarket = {
  id: string;
  question: string;
  outcomes: Array<{
    id: string;
    liquidity: {
      yesPool: number;
      noPool: number;
    } | null;
  }>;
};

function formatHuDate(date: Date | null | undefined): string {
  if (!date) {
    return "Nincs megadva";
  }

  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Budapest",
  }).format(date);
}

function buildDescription(question: string, sourceDescription?: string | null): string {
  const fromEvent = sourceDescription?.trim();
  if (fromEvent) {
    return fromEvent.slice(0, 160);
  }

  const normalizedQuestion = question.trim();
  return `${normalizedQuestion.slice(0, 80)} – ${DEFAULT_DESCRIPTION}`.slice(0, 160);
}

function formatPriceLabel(price?: number | null): string {
  if (typeof price !== "number" || Number.isNaN(price)) {
    return "—";
  }

  return price.toFixed(2);
}

function toMarketQuestionLabel(question: string): string {
  const normalized = question.trim();
  if (normalized.length <= 38) {
    return normalized;
  }

  return `${normalized.slice(0, 35)}...`;
}

export async function getEventShareData(id: string): Promise<EventShareData | null> {
  if (!id) {
    return null;
  }

  try {
    const [
      { getEventById },
      { prisma },
      { calcExecutionPrice },
      { DEFAULT_OUTCOME_POOL },
    ] = await Promise.all([
      import("./getEvents"),
      import("@/lib/prisma"),
      import("@/modules/order/domain/ammQuote"),
      import("@/config/economy"),
    ]);

    const event = await getEventById(id);
    if (!event) {
      return null;
    }

    const category = getCategoryByValue(event.category);

    const previewMarkets = (await prisma.market.findMany({
      where: {
        eventId: event.id,
        NOT: {
          status: { in: ["PENDING_APPROVAL", "CANCELLED"] },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 3,
      select: {
        id: true,
        question: true,
        outcomes: {
          orderBy: { position: "asc" },
          take: 1,
          select: {
            id: true,
            liquidity: {
              select: {
                yesPool: true,
                noPool: true,
              },
            },
          },
        },
      },
    })) as PreviewMarket[];

    const marketPreviews = previewMarkets.map((market) => {
      const outcome = market.outcomes[0];
      const pool = {
        yesPool: outcome?.liquidity?.yesPool ?? DEFAULT_OUTCOME_POOL,
        noPool: outcome?.liquidity?.noPool ?? DEFAULT_OUTCOME_POOL,
      };

      return {
        id: market.id,
        question: toMarketQuestionLabel(market.question),
        yesPriceLabel: formatPriceLabel(calcExecutionPrice(pool, "YES")),
        noPriceLabel: formatPriceLabel(calcExecutionPrice(pool, "NO")),
      };
    });

    return {
      id: event.id,
      question: event.question,
      description: buildDescription(event.question, event.description),
      categoryLabel: category.label,
      bettingCloseLabel: formatHuDate(event.bettingCloseAt),
      marketPreviews,
    };
  } catch (error) {
    console.error("[getEventShareData]", error);
    return null;
  }
}
