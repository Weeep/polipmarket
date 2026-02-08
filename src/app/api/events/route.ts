import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import {
  createEvent,
  CreateEventInput,
} from "@/modules/event/application/createEvent";
import { eventRepository } from "@/modules/event/infrastructure/eventRepository";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function toCreateEventInput(
  body: Record<string, unknown>,
  userId: string,
): CreateEventInput {
  const resolveAtValue = body.resolveAt;
  const resolveAt =
    resolveAtValue instanceof Date
      ? resolveAtValue
      : resolveAtValue != null
        ? new Date(String(resolveAtValue))
        : null;

  return {
    question: String(body.question ?? ""),
    description: typeof body.description === "string" ? body.description : null,
    resolveAt,
    createdBy: userId,
  };
}

export const POST = withAuth(async (user, req) => {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const event = await createEvent(
      eventRepository,
      toCreateEventInput(body, user.id),
    );

    return NextResponse.json(event, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(err, "Bad request") },
      { status: 400 },
    );
  }
});
