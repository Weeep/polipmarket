import { Event } from "../domain/Event";
import { eventRepository } from "../infrastructure/eventRepository";

export async function getEvents(): Promise<Event[]> {
  return eventRepository.findAll();
}

export async function getEventById(id: string): Promise<Event | null> {
  if (!id) return null;
  return eventRepository.findById(id);
}
