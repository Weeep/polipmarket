"use client";

import { useEffect, useState } from "react";
import { EventMarketGroup } from "@/components/EventMarketGroup";
import { MyEventMarketBetDTO } from "@/modules/event/dto/myEventMarketBetDTO";
import { apiFetch } from "@/lib/apiFetch";

const INITIAL_CLOSED_BETS_LIMIT = 20;
const CLOSED_BETS_PAGE_SIZE = 10;

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
) {
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

function limitMarketsByBetCount(
  markets: MyEventMarketBetDTO[],
  limit: number,
): MyEventMarketBetDTO[] {
  if (limit <= 0) {
    return [];
  }

  const limitedMarkets: MyEventMarketBetDTO[] = [];
  let remaining = limit;

  for (const market of markets) {
    if (remaining <= 0) {
      break;
    }

    const bets = market.bets.slice(0, remaining);
    if (bets.length === 0) {
      continue;
    }

    const latestBetAt = bets
      .map((bet) => new Date(bet.createdAt).getTime())
      .reduce((a, b) => Math.max(a, b), 0);

    limitedMarkets.push({
      ...market,
      bets,
      latestBetAt: new Date(latestBetAt).toISOString(),
    });

    remaining -= bets.length;
  }

  return limitedMarkets;
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

export default function MyOrdersPage() {
  const [myMarkets, setMyMarkets] = useState<MyEventMarketBetDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleClosedBetCount, setVisibleClosedBetCount] = useState(
    INITIAL_CLOSED_BETS_LIMIT,
  );

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
        ? prev.filter((market) => market.marketId !== marketId)
        : prev.map((market) =>
            market.marketId === marketId
              ? mergeUpdatedMarket(market, updatedMarket)
              : market,
          ),
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10 text-stone-300">
        Loading…
      </div>
    );
  }

  const openMarkets = filterMarketsByBetStatus(myMarkets, ["OPEN"]);
  const closedMarkets = filterMarketsByBetStatus(myMarkets, [
    "FILLED",
    "CANCELLED",
  ]);
  const totalClosedBetCount = closedMarkets.reduce(
    (sum, market) => sum + market.bets.length,
    0,
  );

  const openMarketGroups = groupMarketsByEvent(openMarkets);
  const visibleClosedMarkets = limitMarketsByBetCount(
    closedMarkets,
    visibleClosedBetCount,
  );
  const closedMarketGroups = groupMarketsByEvent(visibleClosedMarkets);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-bold text-stone-100">Fogadásaim</h1>

      <section className="marketcard-base space-y-4">
        <h2 className="text-lg font-semibold text-stone-200">
          Aktív fogadások
        </h2>
        {openMarketGroups.length === 0 ? (
          <p className="text-sm text-stone-400">Nincs aktív fogadásod.</p>
        ) : (
          <div className="space-y-4">
            {openMarketGroups.map((markets) => (
              <EventMarketGroup
                key={markets[0].eventId ?? markets[0].marketId}
                markets={markets}
                onUpdateMarket={updateMarket}
              />
            ))}
          </div>
        )}
      </section>

      <section className="marketcard-base space-y-4">
        <h2 className="text-lg font-semibold text-stone-200">
          Lezárt fogadások
        </h2>
        {closedMarketGroups.length === 0 ? (
          <p className="text-sm text-stone-400">Nincs lezárt fogadásod.</p>
        ) : (
          <>
            <div className="space-y-4">
              {closedMarketGroups.map((markets) => (
                <EventMarketGroup
                  key={markets[0].eventId ?? markets[0].marketId}
                  markets={markets}
                  onUpdateMarket={updateMarket}
                />
              ))}
            </div>

            {visibleClosedBetCount < totalClosedBetCount && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setVisibleClosedBetCount(
                      (prev) => prev + CLOSED_BETS_PAGE_SIZE,
                    )
                  }
                  className="button-gold px-5 py-2 text-sm"
                >
                  Tovább
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
