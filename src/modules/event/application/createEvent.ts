import { Event } from "../domain/Event";
import { EventRepository } from "../infrastructure/eventRepository";

export type CreateEventInput = {
  question: string;
  description?: string | null;
  bettingCloseAt: Date;
  resolveAt?: Date | null;
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

  return repo.create({
    question: input.question.trim(),
    description: input.description ?? null,
    bettingCloseAt: input.bettingCloseAt,
    resolveAt: input.resolveAt ?? null,
    createdBy: input.createdBy,
  });
}
