"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OpenBetsGrid } from "@/components/OpenBetsGrid";
import { ActiveEventsTabsTable } from "@/components/ActiveEventsTabsTable";
import { MyEventMarketBetDTO } from "@/modules/event/dto/myEventMarketBetDTO";
import { apiFetch } from "@/lib/apiFetch";

const EVENTS_LIMIT = 6;

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

export default function HomePage() {
  const [myMarkets, setMyMarkets] = useState<MyEventMarketBetDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/events/my?limit=${EVENTS_LIMIT}`)
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

  return (
    <main className="p-0 sm:p-8">
      <div className="max-w-6xl mx-auto py-0 sm:px-6 sm:py-10 space-y-6 sm:space-y-10 pt-2">
        <ActiveEventsTabsTable />

        <div className="marketcard-base space-y-4 scroll-mt-24">
          <h2 className="text-lg font-bold text-stone-100">
            Fogadásaim (utolsó {EVENTS_LIMIT})
          </h2>

          <OpenBetsGrid
            markets={openMarkets}
            onUpdateMarket={updateMarket}
            emptyMessage="Nincs nyitott fogadásod"
          />

          <div>
            <Link href="/myorders" className="text-amber-300 hover:underline">
              Összes fogadás
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
