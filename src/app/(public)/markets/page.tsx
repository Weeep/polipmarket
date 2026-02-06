"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Market, MarketStats, Outcome } from "@/modules/market/domain/Market";
import { apiFetch } from "@/lib/apiFetch";
import { MarketCard } from "@/components/MarketCard";

type OutcomeWithPrices = Outcome & {
  yesPrice?: number;
  noPrice?: number;
};

type MarketSummary = Market & {
  outcomes?: OutcomeWithPrices[];
  marketStats?: MarketStats | null;
};

export default function MarketsPage() {
  const [markets, setMarkets] = useState<MarketSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/markets?include=outcomes,prices")
      .then((res) => res.json())
      .then((data) => setMarkets(data as MarketSummary[]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading markets…</p>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-white">Markets</h1>

        <Link href="/markets/new" className="button-gold">
          New market
        </Link>
      </div>

      <div className="space-y-4">
        {markets.map((m) => (
          <MarketCard key={m.id} market={m} marketStats={m.marketStats} />
        ))}
      </div>
    </div>
  );
}
