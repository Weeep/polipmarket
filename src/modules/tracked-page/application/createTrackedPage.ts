import { trackedPageRepository } from "../infrastructure/trackedPageRepository";
import { CreateTrackedPageInput } from "./trackedPageInput";

export async function createTrackedPage(input: CreateTrackedPageInput) {
  try {
    return await trackedPageRepository.create(input);
  } catch (error: unknown) {
    if (trackedPageRepository.isKnownUniqueConstraintError(error)) {
      throw new Error("Már létezik oldal ezzel az URL-lel vagy kanonikus URL-lel.");
    }

    throw error;
  }
}
