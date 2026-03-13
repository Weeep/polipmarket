"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EventCard } from "@/components/EventCard";
import { apiFetch } from "@/lib/apiFetch";
import { EventSummary } from "@/modules/event/domain/Event";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function EventDetailClient({ id }: { id: string }) {
  const [event, setEvent] = useState<EventSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(`/api/events/${id}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Event not found");
        }
        return res.json() as Promise<EventSummary>;
      })
      .then((data) => setEvent(data))
      .catch((err: unknown) => {
        setError(getErrorMessage(err, "Failed to load event"));
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="max-w-5xl mx-auto px-6 py-8 text-white">Loading…</div>;
  }

  if (error || !event) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8 text-white">
        {error ?? "Event not found"}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-3 flex justify-end">
        <Link
          href="/events/new"
          className="text-yellow-500 font-semibold hover:text-yellow-400 hover:underline"
        >
          Én is létrehozok egy eseményt!
        </Link>
      </div>
      <EventCard event={event} />
    </div>
  );
}
