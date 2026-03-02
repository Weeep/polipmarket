"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { EventCard } from "@/components/EventCard";
import { useMe } from "@/context/MeContext";
import { EventCategory, EventSummary } from "@/modules/event/domain/Event";
import {
  EVENT_CATEGORY_OPTIONS,
  getCategoryByValue,
  parseCategoryParam,
} from "@/modules/event/domain/eventCategoryMeta";

function normalizeSearchTerm(value: string | null) {
  return (value ?? "").trim().toLocaleLowerCase();
}

function EventsPageContent() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableCategories, setAvailableCategories] = useState<
    EventCategory[]
  >([]);
  const { me, isMeResolved } = useMe();

  const query = normalizeSearchTerm(searchParams.get("q"));
  const hasValidQuery = query.length >= 2;
  const selectedCategory = parseCategoryParam(searchParams.get("category"));
  const topCategories = EVENT_CATEGORY_OPTIONS.slice(0, 2);
  const moreCategories = EVENT_CATEGORY_OPTIONS.slice(2);

  const visibleCategoryOptions = useMemo(() => {
    if (availableCategories.length === 0) {
      return EVENT_CATEGORY_OPTIONS;
    }

    return EVENT_CATEGORY_OPTIONS.filter((option) =>
      availableCategories.includes(option.value),
    );
  }, [availableCategories]);

  useEffect(() => {
    apiFetch("/api/categories")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Array<{ value?: string; isActive?: boolean }>) => {
        const values = data
          .filter((item) => item.isActive !== false)
          .map((item) => parseCategoryParam(item.value ?? null))
          .filter((value): value is EventCategory => value !== null);

        if (values.length > 0) {
          setAvailableCategories(values);
        }
      })
      .catch(() => {
        setAvailableCategories([]);
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();

    if (hasValidQuery) {
      params.set("q", query);
    }

    if (selectedCategory) {
      params.set("category", selectedCategory);
    }

    const endpoint = params.toString()
      ? `/api/events?${params.toString()}`
      : "/api/events";

    apiFetch(endpoint)
      .then((res) => res.json())
      .then((data) => setEvents(data as EventSummary[]))
      .finally(() => setLoading(false));
  }, [hasValidQuery, query, selectedCategory]);

  if (loading) return <p>Loading events…</p>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-stone-100">Események</h1>

        {me ? (
          <Link href="/events/new" className="button-gold">
            Új
          </Link>
        ) : (
          <button
            type="button"
            disabled
            title={
              isMeResolved
                ? "Új esemény létrehozásához be kell jelentkezned."
                : "Felhasználói állapot betöltése..."
            }
            className="button-gold cursor-not-allowed opacity-50"
          >
            Új
          </button>
        )}
      </div>

      {/*TODO: Remove later */}
      <div className="hidden rounded-xl border border-zinc-700 bg-zinc-900/70 p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <Link
            href={
              hasValidQuery
                ? `/events?q=${encodeURIComponent(query)}`
                : "/events"
            }
            className={`rounded-full px-3 py-1 text-sm border transition ${
              selectedCategory === null
                ? "bg-amber-400/20 border-amber-300 text-amber-100"
                : "border-zinc-600 text-stone-300 hover:border-zinc-400"
            }`}
          >
            Összes
          </Link>

          {topCategories
            .filter((option) =>
              visibleCategoryOptions.some((v) => v.value === option.value),
            )
            .map((option) => (
              <Link
                key={option.value}
                href={`/events?${new URLSearchParams({
                  ...(hasValidQuery ? { q: query } : {}),
                  category: option.slug,
                }).toString()}`}
                className={`rounded-full px-3 py-1 text-sm border transition ${
                  selectedCategory === option.value
                    ? "bg-amber-400/20 border-amber-300 text-amber-100"
                    : "border-zinc-600 text-stone-300 hover:border-zinc-400"
                }`}
              >
                {option.label}
              </Link>
            ))}

          <details className="relative">
            <summary className="list-none cursor-pointer rounded-full px-3 py-1 text-sm border border-zinc-600 text-stone-300 hover:border-zinc-400">
              Több…
            </summary>
            <div className="absolute z-10 mt-2 min-w-44 rounded-lg border border-zinc-600 bg-zinc-950 p-2 shadow-xl">
              {moreCategories
                .filter((option) =>
                  visibleCategoryOptions.some((v) => v.value === option.value),
                )
                .map((option) => (
                  <Link
                    key={option.value}
                    href={`/events?${new URLSearchParams({
                      ...(hasValidQuery ? { q: query } : {}),
                      category: option.slug,
                    }).toString()}`}
                    className={`block rounded-md px-2 py-1.5 text-sm ${
                      selectedCategory === option.value
                        ? "bg-amber-400/20 text-amber-100"
                        : "text-stone-300 hover:bg-zinc-800"
                    }`}
                  >
                    {option.label}
                  </Link>
                ))}
            </div>
          </details>
        </div>
      </div>

      {query.length > 0 && !hasValidQuery && (
        <p className="text-sm text-stone-300">
          A kereséshez legalább 2 karaktert adj meg.
        </p>
      )}

      {(hasValidQuery || selectedCategory) && (
        <p className="text-sm text-stone-300">
          {hasValidQuery && (
            <>
              Keresés:{" "}
              <span className="font-semibold text-stone-100">{query}</span>
            </>
          )}
          {hasValidQuery && selectedCategory && <span className="mx-2">•</span>}
          {selectedCategory && (
            <>
              Kategória:{" "}
              <span className="font-semibold text-stone-100">
                {getCategoryByValue(selectedCategory).label}
              </span>
            </>
          )}
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

export default function EventsPage() {
  return (
    <Suspense fallback={<p>Loading events…</p>}>
      <EventsPageContent />
    </Suspense>
  );
}
