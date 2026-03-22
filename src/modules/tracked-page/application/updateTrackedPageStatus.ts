import { TrackedPageStatus } from "../domain/TrackedPage";
import { trackedPageRepository } from "../infrastructure/trackedPageRepository";

export async function updateTrackedPageStatus(id: string, status: TrackedPageStatus) {
  return trackedPageRepository.updateStatus(id, status);
}
