import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { Event, EventCategory } from "@/modules/event/domain/Event";
import { DEFAULT_AMM_FEE_BPS } from "@/config/economy";

type CreateEventData = {
  question: string;
  description?: string | null;
  category: EventCategory;
  bettingCloseAt: Date;
  resolveAt?: Date | null;
  feeBps?: number;
  createdBy: string;
};

type EventRecord = {
  id: string;
  question: string;
  description: string | null;
  category: EventCategory;
  bettingCloseAt: Date;
  resolveAt: Date | null;
  feeBps: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

function toDomain(event: EventRecord): Event {
  return {
    id: event.id,
    question: event.question,
    description: event.description,
    category: event.category,
    bettingCloseAt: event.bettingCloseAt,
    resolveAt: event.resolveAt,
    createdBy: event.createdBy,
    feeBps: event.feeBps,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

export type EventRepository = {
  create(data: CreateEventData, tx?: Prisma.TransactionClient): Promise<Event>;
  findAll(tx?: Prisma.TransactionClient): Promise<Event[]>;
  findById(id: string, tx?: Prisma.TransactionClient): Promise<Event | null>;
  update(
    id: string,
    data: Partial<Omit<CreateEventData, "createdBy">>,
    tx?: Prisma.TransactionClient,
  ): Promise<Event>;
};

export const eventRepository: EventRepository = {
  async create(data, tx) {
    const client = tx ?? prisma;
    const created = await client.event.create({
      data: {
        question: data.question,
        description: data.description ?? null,
        category: data.category,
        bettingCloseAt: data.bettingCloseAt,
        resolveAt: data.resolveAt ?? null,
        createdBy: data.createdBy,
        feeBps: data.feeBps ?? DEFAULT_AMM_FEE_BPS,
      },
    });

    return toDomain(created);
  },

  async findAll(tx) {
    const client = tx ?? prisma;
    const events = await client.event.findMany({
      orderBy: { createdAt: "desc" },
    });

    return events.map(toDomain);
  },

  async findById(id, tx) {
    const client = tx ?? prisma;
    const event = await client.event.findUnique({ where: { id } });
    return event ? toDomain(event) : null;
  },

  async update(id, data, tx) {
    const client = tx ?? prisma;
    const updated = await client.event.update({
      where: { id },
      data: {
        question: data.question,
        description: data.description ?? null,
        category: data.category,
        bettingCloseAt: data.bettingCloseAt,
        resolveAt: data.resolveAt ?? null,
        feeBps: data.feeBps,
      },
    });

    return toDomain(updated);
  },
};
