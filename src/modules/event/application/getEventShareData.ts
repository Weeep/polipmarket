import { getCategoryByValue } from "@/modules/event/domain/eventCategoryMeta";

export type EventShareData = {
  id: string;
  question: string;
  description: string;
  categoryLabel: string;
  bettingCloseLabel: string;
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

export async function getEventShareData(id: string): Promise<EventShareData | null> {
  if (!id) {
    return null;
  }

  try {
    const { getEventById } = await import("./getEvents");
    const event = await getEventById(id);
    if (!event) {
      return null;
    }

    const category = getCategoryByValue(event.category);

    return {
      id: event.id,
      question: event.question,
      description: buildDescription(event.question, event.description),
      categoryLabel: category.label,
      bettingCloseLabel: formatHuDate(event.bettingCloseAt),
    };
  } catch (error) {
    console.error("[getEventShareData]", error);
    return null;
  }
}
