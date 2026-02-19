"use client";

import { useEffect, useState } from "react";
import { EventMarketGroup } from "@/components/EventMarketGroup";
import { ActiveEventsTabsTable } from "@/components/ActiveEventsTabsTable";
import { MyEventMarketBetDTO } from "@/modules/event/dto/myEventMarketBetDTO";
import { apiFetch } from "@/lib/apiFetch";

function groupMarketsByEvent(markets: MyEventMarketBetDTO[]) {
  const grouped = new Map<string, MyEventMarketBetDTO[]>();

  markets.forEach((market) => {
    const key = market.eventId ?? `market-${market.marketId}`;
    const current = grouped.get(key) ?? [];
    grouped.set(key, [...current, market]);
  });

  return Array.from(grouped.values()).sort((a, b) => {
    const aLatest = Math.max(
      ...a.map((market) => new Date(market.latestBetAt).getTime()),
    );
    const bLatest = Math.max(
      ...b.map((market) => new Date(market.latestBetAt).getTime()),
    );

    return bLatest - aLatest;
  });
}

function filterMarketsByBetStatus(
  markets: MyEventMarketBetDTO[],
  statuses: string[],
): MyEventMarketBetDTO[] {
  return markets
    .map((market) => {
      const filteredBets = market.bets.filter((bet) =>
        statuses.includes(bet.status),
      );

      if (filteredBets.length === 0) {
        return null;
      }

      const latestBetAt = filteredBets
        .map((bet) => new Date(bet.createdAt).getTime())
        .reduce((a, b) => Math.max(a, b), 0);

      return {
        ...market,
        bets: filteredBets,
        latestBetAt: new Date(latestBetAt).toISOString(),
      };
    })
    .filter((market): market is MyEventMarketBetDTO => market !== null)
    .sort(
      (a, b) =>
        new Date(b.latestBetAt).getTime() - new Date(a.latestBetAt).getTime(),
    );
}

function mergeUpdatedMarket(
  currentMarket: MyEventMarketBetDTO,
  updatedMarket: MyEventMarketBetDTO,
): MyEventMarketBetDTO {
  const updatedBetsByLotId = new Map(
    updatedMarket.bets.map((bet) => [bet.lotId, bet]),
  );

  const mergedCurrentBets = currentMarket.bets.map(
    (bet) => updatedBetsByLotId.get(bet.lotId) ?? bet,
  );
  const currentLotIds = new Set(currentMarket.bets.map((bet) => bet.lotId));
  const newBets = updatedMarket.bets.filter(
    (bet) => !currentLotIds.has(bet.lotId),
  );

  return {
    ...currentMarket,
    ...updatedMarket,
    bets: [...mergedCurrentBets, ...newBets],
  };
}

function HomeSearchBar() {
  return (
    <div className="md:hidden px-4 pt-3">
      <label className="block">
        <span className="sr-only">Search</span>
        <input
          type="search"
          placeholder="Keresés események között..."
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-stone-100 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none"
        />
      </label>
    </div>
  );
}

export default function HomePage() {
  const [myMarkets, setMyMarkets] = useState<MyEventMarketBetDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/events/my")
      .then((r) => (r.ok ? r.json() : []))
      .then(setMyMarkets)
      .finally(() => setLoading(false));
  }, []);

  function updateMarket(
    marketId: string,
    updatedMarket: MyEventMarketBetDTO | null,
  ) {
    setMyMarkets((prev) =>
      updatedMarket === null
        ? prev.filter((m) => m.marketId !== marketId)
        : prev.map((m) =>
            m.marketId === marketId ? mergeUpdatedMarket(m, updatedMarket) : m,
          ),
    );
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-10 text-stone-300">
        Loading…
      </div>
    );
  }

  const openMarkets = filterMarketsByBetStatus(myMarkets, ["OPEN"]);
  const closedMarkets = filterMarketsByBetStatus(myMarkets, [
    "FILLED",
    "CANCELLED",
  ]);
  const openMarketGroups = groupMarketsByEvent(openMarkets);
  const closedMarketGroups = groupMarketsByEvent(closedMarkets);

  return (
    <main className="p-0 sm:p-8">
      <HomeSearchBar />
      <div className="max-w-6xl mx-auto py-0 sm:px-6 sm:py-10 space-y-6 sm:space-y-10 pt-2">
        <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
          <ActiveEventsTabsTable />

          <div id="fogadasaim" className="marketcard-base space-y-4 scroll-mt-24">
            <h2 className="text-lg font-bold text-stone-100">Fogadásaim</h2>

            {openMarketGroups.length === 0 && (
              <p className="text-stone-400 text-sm">Nincs nyitott fogadásod</p>
            )}

            <div className="space-y-4">
              {openMarketGroups.map((markets) => (
                <EventMarketGroup
                  key={markets[0].eventId ?? markets[0].marketId}
                  markets={markets}
                  onUpdateMarket={updateMarket}
                />
              ))}
            </div>
          </div>
        </div>

        <div id="sikerek" className="marketcard-base space-y-4 scroll-mt-24">
          <h2 className="text-lg font-bold text-stone-100">Lezárt fogadások</h2>

          {closedMarketGroups.length === 0 && (
            <p className="text-stone-400 text-sm">Nincs lezárt fogadásod</p>
          )}

          <div className="space-y-4">
            {closedMarketGroups.map((markets) => (
              <EventMarketGroup
                key={markets[0].eventId ?? markets[0].marketId}
                markets={markets}
                onUpdateMarket={updateMarket}
              />
            ))}
          </div>
        </div>
      </div>

    </main>
  );
}
