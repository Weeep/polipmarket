import { Event } from "../domain/Event";
import { EventRepository } from "../infrastructure/eventRepository";

export type CreateEventInput = {
  question: string;
  description?: string | null;
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

  if (input.resolveAt && input.resolveAt <= new Date()) {
    throw new Error("resolveAt must be in the future");
  }

  return repo.create({
    question: input.question.trim(),
    description: input.description ?? null,
    resolveAt: input.resolveAt ?? null,
    createdBy: input.createdBy,
  });
}
