import { trackedPageRepository } from "../infrastructure/trackedPageRepository";

export async function listTrackedPages() {
  return trackedPageRepository.findAll();
}
