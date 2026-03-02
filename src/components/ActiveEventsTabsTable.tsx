"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { getRemainingTimeInfo } from "@/lib/remainingTime";
import { EVENT_CATEGORY_OPTIONS } from "@/modules/event/domain/eventCategoryMeta";
import type { EventSummary } from "@/modules/event/domain/Event";
import type { EventCategory } from "@/modules/event/domain/Event";

type ActiveEventsSort =
  | "created_desc"
  | "volume_desc"
  | "betting_close_asc"
  | "event_close_asc";

function formatVolume(value?: number) {
  return Math.round(value ?? 0).toLocaleString("hu-HU");
}

export function ActiveEventsTabsTable() {
  const [activeSort, setActiveSort] = useState<ActiveEventsSort>("created_desc");
  const [activeCategory, setActiveCategory] = useState<EventCategory | null>(null);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      activeOnly: "true",
      sort: activeSort,
      limit: "20",
    });

    if (activeCategory) {
      params.set("category", activeCategory);
    }

    return `/api/events?${params.toString()}`;
  }, [activeCategory, activeSort]);

  useEffect(() => {
    apiFetch(query)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setEvents((data as EventSummary[]) ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [query]);

  function handleSortChange(sort: ActiveEventsSort) {
    setLoading(true);
    setActiveSort(sort);
  }

  function handleCategoryChange(category: EventCategory | null) {
    setLoading(true);
    setActiveCategory(category);
  }

  return (
    <section className="marketcard-base space-y-4">
      <p className="text-sm text-stone-400">
        Üdv! Itt láthatsz pár eseményt, csak kattints a neked szimpatikus
        esemény sorára és már fogadhatsz is!
      </p>
      <h2 className="text-lg font-bold text-stone-100">Fogadható események</h2>

      <div className="flex flex-wrap gap-4 justify-center">
        <button
          type="button"
          onClick={() => handleCategoryChange(null)}
          className={`rounded-full border px-3 py-1 text-sm ${
            activeCategory === null
              ? "border-amber-300 bg-amber-400/20 text-amber-100"
              : "border-zinc-600 text-stone-300"
          }`}
        >
          Összes
        </button>

        {EVENT_CATEGORY_OPTIONS.map((category) => (
          <button
            key={category.value}
            type="button"
            onClick={() => handleCategoryChange(category.value)}
            className={`rounded-full border px-3 py-1 text-sm ${
              activeCategory === category.value
                ? "border-amber-300 bg-amber-400/20 text-amber-100"
                : "border-zinc-600 text-stone-300"
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto px-[.5rem]">
        <table className="min-w-full table-fixed text-sm text-stone-200">
          <thead className="text-left text-stone-400">
            <tr className="border-b border-stone-700">
              <th className="py-2 pr-4">
                <button
                  type="button"
                  className={`inline-flex items-center gap-2 ${activeSort === "created_desc" ? "text-amber-300" : "hover:text-stone-200"}`}
                  onClick={() => handleSortChange("created_desc")}
                >
                  Esemény
                  <span
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-stone-500 text-[10px]"
                    title="Az esemény létrejöttének ideje szerint történik a rendezés (nem ABC sorrendben)."
                    aria-label="Az esemény létrejöttének ideje szerint történik a rendezés"
                  >
                    i
                  </span>
                </button>
              </th>
              <th className="py-2 pr-4">
                <button
                  type="button"
                  className={activeSort === "volume_desc" ? "text-amber-300" : "hover:text-stone-200"}
                  onClick={() => handleSortChange("volume_desc")}
                >
                  Összes tét
                </button>
              </th>
              <th className="py-2 pr-4">
                <button
                  type="button"
                  className={activeSort === "betting_close_asc" ? "text-amber-300" : "hover:text-stone-200"}
                  onClick={() => handleSortChange("betting_close_asc")}
                >
                  Fogadás zárás
                </button>
              </th>
              <th className="py-2">
                <button
                  type="button"
                  className={activeSort === "event_close_asc" ? "text-amber-300" : "hover:text-stone-200"}
                  onClick={() => handleSortChange("event_close_asc")}
                >
                  Esemény zárás
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="py-4 text-stone-400" colSpan={4}>
                  Betöltés...
                </td>
              </tr>
            )}

            {!loading && events.length === 0 && (
              <tr>
                <td className="py-4 text-stone-400" colSpan={4}>
                  Nincs megjeleníthető aktív esemény.
                </td>
              </tr>
            )}

            {!loading &&
              events.map((event) => (
                <tr
                  key={event.id}
                  className="border-b border-stone-800 transition-colors hover:bg-stone-800/60"
                >
                  <td className="py-3 pr-4 font-medium text-stone-100">
                    <Link
                      href={`/events/${event.id}`}
                      className="block text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    >
                      {event.question}
                    </Link>
                  </td>
                  <td className="py-3 pr-4">
                    <Link
                      href={`/events/${event.id}`}
                      className="block text-stone-300 hover:text-stone-100"
                    >
                      {formatVolume(event.eventStats?.totalVolume)} ଳ
                    </Link>
                  </td>
                  <td className="py-3 pr-4">
                    <Link
                      href={`/events/${event.id}`}
                      className="block text-stone-300 hover:text-stone-100"
                    >
                      {getRemainingTimeInfo(event.bettingCloseAt).longLabel}
                    </Link>
                  </td>
                  <td className="py-3">
                    <Link
                      href={`/events/${event.id}`}
                      className="block text-stone-300 hover:text-stone-100"
                    >
                      {getRemainingTimeInfo(event.resolveAt).longLabel}
                    </Link>
                  </td>
                </tr>
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
