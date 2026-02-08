"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MarketRow } from "@/components/MarketRow";
import { MyMarketBetDTO } from "@/modules/market/dto/myMarketBetDTO";
import { apiFetch } from "@/lib/apiFetch";

export default function HomePage() {
  const [myMarkets, setMyMarkets] = useState<MyMarketBetDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/markets/my")
      .then((r) => (r.ok ? r.json() : []))
      .then(setMyMarkets)
      .finally(() => setLoading(false));
  }, []);

  function updateMarket(
    marketId: string,
    updatedMarket: MyMarketBetDTO | null,
  ) {
    setMyMarkets((prev) =>
      updatedMarket === null
        ? prev.filter((m) => m.marketId !== marketId)
        : prev.map((m) => (m.marketId === marketId ? updatedMarket : m)),
    );
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-10 text-stone-300">
        Loading…
      </div>
    );
  }

  const openMarkets = myMarkets
    .filter((market) => market.status === "OPEN")
    .sort(
      (a, b) =>
        new Date(b.latestBetAt).getTime() -
        new Date(a.latestBetAt).getTime(),
    );
  const closedMarkets = myMarkets
    .filter((market) => market.status !== "OPEN")
    .sort(
      (a, b) =>
        new Date(b.latestBetAt).getTime() -
        new Date(a.latestBetAt).getTime(),
    );

  return (
    <main className="p-8">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        <div className="marketcard-base space-y-4">
          <h2 className="text-lg font-bold text-stone-100">
            Nyitott marketjeim
          </h2>

          {openMarkets.length === 0 && (
            <p className="text-stone-400 text-sm">Nincs aktív fogadásod</p>
          )}

          <div className="space-y-4">
            {openMarkets.map((market) => (
              <MarketRow
                key={market.marketId}
                market={market}
                onUpdate={(updatedMarket) =>
                  updateMarket(market.marketId, updatedMarket)
                }
              />
            ))}
          </div>
        </div>

        <div className="marketcard-base space-y-4">
          <h2 className="text-lg font-bold text-stone-100">
            Lezárt marketjeim
          </h2>

          {closedMarkets.length === 0 && (
            <p className="text-stone-400 text-sm">
              Nincs lezárt fogadásod
            </p>
          )}

          <div className="space-y-4">
            {closedMarkets.map((market) => (
              <MarketRow
                key={market.marketId}
                market={market}
                onUpdate={(updatedMarket) =>
                  updateMarket(market.marketId, updatedMarket)
                }
              />
            ))}
          </div>
        </div>
      </div>

      {/*<p className="mb-4">Logged in as {session.user.email}</p>*/}
      <Link href="/markets">
        <button className="button-gold m-4">Markets</button>
      </Link>

      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="rounded-xl bg-red-600 px-4 py-2 text-white"
      >
        Logout
      </button>
    </main>
  );
}
