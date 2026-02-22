"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { EventCard } from "@/components/EventCard";
import { EventSummary } from "@/modules/event/domain/Event";

function normalizeSearchTerm(value: string | null) {
  return (value ?? "").trim().toLocaleLowerCase();
}

export default function EventsPage() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const query = normalizeSearchTerm(searchParams.get("q"));
  const hasValidQuery = query.length >= 2;

  useEffect(() => {
    const params = new URLSearchParams();

    if (hasValidQuery) {
      params.set("q", query);
    }

    const endpoint = params.toString() ? `/api/events?${params.toString()}` : "/api/events";

    apiFetch(endpoint)
      .then((res) => res.json())
      .then((data) => setEvents(data as EventSummary[]))
      .finally(() => setLoading(false));
  }, [hasValidQuery, query]);

  if (loading) return <p>Loading events…</p>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-stone-100">Események</h1>

        <Link href="/events/new" className="button-gold">
          New event
        </Link>
      </div>

      {query.length > 0 && !hasValidQuery && (
        <p className="text-sm text-stone-300">
          A kereséshez legalább 2 karaktert adj meg.
        </p>
      )}

      {hasValidQuery && (
        <p className="text-sm text-stone-300">
          Keresés: <span className="font-semibold text-stone-100">{query}</span>
        </p>
      )}

      <div className="space-y-10">
        {events.length === 0 ? (
          <p className="text-stone-300">Nincs találat a keresésre.</p>
        ) : (
          events.map((event) => <EventCard key={event.id} event={event} />)
        )}
      </div>
    </div>
  );
}
