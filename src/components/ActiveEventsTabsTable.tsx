"use client";

import Link from "next/link";
import { Fragment } from "react";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { getRemainingTimeInfo } from "@/lib/remainingTime";
import type { EventSummary } from "@/modules/event/domain/Event";

type ActiveEventsTab = "TOP_VOLUME" | "BETTING_CLOSE" | "EVENT_CLOSE";

const TAB_CONFIG: Record<
  ActiveEventsTab,
  {
    label: string;
    sort: "volume_desc" | "betting_close_asc" | "event_close_asc";
  }
> = {
  TOP_VOLUME: {
    label: "Legtöbb fogadás",
    sort: "volume_desc",
  },
  BETTING_CLOSE: {
    label: "Záruló fogadás",
    sort: "betting_close_asc",
  },
  EVENT_CLOSE: {
    label: "Záruló esemény",
    sort: "event_close_asc",
  },
};

function formatVolume(value?: number) {
  return Math.round(value ?? 0).toLocaleString("hu-HU");
}

export function ActiveEventsTabsTable() {
  const [activeTab, setActiveTab] = useState<ActiveEventsTab>("TOP_VOLUME");
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const query = useMemo(() => {
    const sort = TAB_CONFIG[activeTab].sort;
    return `/api/events?activeOnly=true&sort=${sort}&limit=20`;
  }, [activeTab]);

  useEffect(() => {
    apiFetch(query)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setEvents((data as EventSummary[]) ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <section className="marketcard-base space-y-4">
      <h2 className="text-lg font-bold text-stone-100">Aktív események</h2>

      <div className="flex flex-wrap gap-2 justify-center">
        {(Object.keys(TAB_CONFIG) as ActiveEventsTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setLoading(true);
              setActiveTab(tab);
            }}
            data-active={activeTab === tab}
            className="rounded-md border border-stone-700 px-3 py-1 text-sm text-stone-200 data-[active=true]:border-amber-400 data-[active=true]:text-amber-300"
          >
            {TAB_CONFIG[tab].label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-stone-200">
          <thead className="text-left text-stone-400">
            <tr className="border-b border-stone-700">
              <th className="py-2 pr-4">Összes tét</th>
              <th className="py-2 pr-4">Fogadás zárás</th>
              <th className="py-2">Esemény zárás</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="py-4 text-stone-400" colSpan={3}>
                  Betöltés...
                </td>
              </tr>
            )}

            {!loading && events.length === 0 && (
              <tr>
                <td className="py-4 text-stone-400" colSpan={3}>
                  Nincs megjeleníthető aktív esemény.
                </td>
              </tr>
            )}

            {!loading &&
              events.map((event) => (
                <Fragment key={event.id}>
                  <tr>
                    <td className="pb-1 pt-3" colSpan={3}>
                      <Link
                        href={`/events/${event.id}`}
                        className="font-medium hover:underline"
                      >
                        {event.question}
                      </Link>
                    </td>
                  </tr>
                  <tr className="border-b border-stone-800">
                    <td className="pb-3 pr-4 text-stone-300">
                      {formatVolume(event.eventStats?.totalVolume)}
                    </td>
                    <td className="pb-3 pr-4 text-stone-300">
                      {getRemainingTimeInfo(event.bettingCloseAt).longLabel}
                    </td>
                    <td className="pb-3 text-stone-300">
                      {getRemainingTimeInfo(event.resolveAt).longLabel}
                    </td>
                  </tr>
                </Fragment>
              ))}
          </tbody>
        </table>
      </div>

      <div>
        <Link href="/events" className="text-amber-300 hover:underline">
          Összes esemény
        </Link>
      </div>
    </section>
  );
}
