"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { EventCard } from "@/components/EventCard";
import { Market, MarketStats, Outcome } from "@/modules/market/domain/Market";
import { Event } from "@/modules/event/domain/Event";

type OutcomeWithPrices = Outcome & {
  yesPrice?: number;
  noPrice?: number;
};

type MarketSummary = Market & {
  outcomes?: OutcomeWithPrices[];
  marketStats?: MarketStats | null;
};

type EventStats = {
  totalBets: number;
  totalVolume: number;
};

type EventSummary = Event & {
  markets: MarketSummary[];
  eventStats?: EventStats;
};

export default function EventsPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/events")
      .then((res) => res.json())
      .then((data) => setEvents(data as EventSummary[]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading events…</p>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-white">Events</h1>

        <Link href="/events/new" className="button-gold">
          New event
        </Link>
      </div>

      <div className="space-y-10">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
