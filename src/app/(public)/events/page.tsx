"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { Market, MarketStats, Outcome } from "@/modules/market/domain/Market";
import { Event } from "@/modules/event/domain/Event";
import { MarketCard } from "@/components/MarketCard";

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
          <section key={event.id} className="marketcard-base space-y-6">
            <div className="space-y-2">
              <h2 className="marketcard-question">{event.question}</h2>
              {event.description && (
                <p className="marketcard-description">{event.description}</p>
              )}
              <div className="marketcard-statusbar">
                <span>
                  Fogadás zár:{" "}
                  {new Date(event.bettingCloseAt).toLocaleString()}
                </span>
                {event.resolveAt && (
                  <span>
                    Esemény vége: {new Date(event.resolveAt).toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {event.markets.map((market) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>

            {event.eventStats && (
              <div className="marketcard-statusbar justify-center">
                Bets: {event.eventStats.totalBets} · Volume:{" "}
                {event.eventStats.totalVolume}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
