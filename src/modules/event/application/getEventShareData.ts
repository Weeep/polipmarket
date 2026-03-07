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
    const [{ getEventById }, { getMarketsByEventId }] = await Promise.all([
      import("./getEvents"),
      import("@/modules/market/application/getMarketsByEventId"),
    ]);

    const event = await getEventById(id);
    if (!event) {
      return null;
    }

    const category = getCategoryByValue(event.category);
    const markets = await getMarketsByEventId(event.id);
    const marketPreviews = markets.slice(0, 3).map((market) => {
      const outcome = market.outcomes?.[0];

      return {
        id: market.id,
        question: toMarketQuestionLabel(market.question),
        yesPriceLabel: formatPriceLabel(outcome?.yesPrice),
        noPriceLabel: formatPriceLabel(outcome?.noPrice),
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
