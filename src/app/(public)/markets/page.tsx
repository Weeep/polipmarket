"use client";

import { useEffect, useState } from "react";
import { Market } from "@/modules/market/domain/Market";
import { apiFetch } from "@/lib/apiFetch";
import { MarketCard } from "@/components/MarketCard";

export default function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/markets")
      .then((res) => res.json())
      .then(setMarkets)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading markets…</p>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-white">Markets</h1>

        <a href="/markets/new" className="button-gold">
          New market
        </a>
      </div>

      <div className="space-y-4">
        {markets.map((m) => (
          <MarketCard key={m.id} market={m} />
        ))}
      </div>
    </div>
  );
}
