import { Event, EventCategory } from "../domain/Event";
import { EventRepository } from "../infrastructure/eventRepository";
import { DEFAULT_AMM_FEE_BPS } from "@/config/economy";

export type CreateEventInput = {
  question: string;
  description?: string | null;
  category: EventCategory;
  bettingCloseAt: Date;
  resolveAt?: Date | null;
  feeBps?: number;
  createdBy: string;
};

export async function createEvent(
  repo: EventRepository,
  input: CreateEventInput,
): Promise<Event> {
  if (!input.question.trim()) {
    throw new Error("Question is required");
  }

  if (input.bettingCloseAt <= new Date()) {
    throw new Error("bettingCloseAt must be in the future");
  }

  if (input.resolveAt && input.resolveAt <= input.bettingCloseAt) {
    throw new Error("resolveAt must be after bettingCloseAt");
  }

  const feeBps = input.feeBps ?? DEFAULT_AMM_FEE_BPS;
  if (feeBps < 0 || feeBps > 1000) {
    throw new Error("feeBps must be between 0 and 1000");
  }

  return repo.create({
    question: input.question.trim(),
    description: input.description ?? null,
    category: input.category,
    bettingCloseAt: input.bettingCloseAt,
    resolveAt: input.resolveAt ?? null,
    createdBy: input.createdBy,
    feeBps,
  });
}
