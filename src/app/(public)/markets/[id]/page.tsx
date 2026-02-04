"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MarketCard } from "@/components/MarketCard";
import { Market, MarketStats } from "@/modules/market/domain/Market";
import { redirect } from "next/navigation";
import { useMe } from "@/context/MeContext";
import { apiFetch } from "@/lib/apiFetch";

export default function MarketDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);

  // trading state
  const [price, setPrice] = useState(0.5);
  const [amount, setAmount] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stats, setStats] = useState<MarketStats | null>(null);

  const { refreshMe } = useMe();

  useEffect(() => {
    Promise.all([
      apiFetch(`/api/markets/${id}`).then((r) => (r.ok ? r.json() : null)),
      apiFetch(`/api/markets/${id}/stats`).then((r) =>
        r.ok ? r.json() : null,
      ),
    ])
      .then(([market, stats]) => {
        setMarket(market);
        setStats(stats);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function placeOrder(outcomeId: "YES" | "NO") {
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const res = await apiFetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketId: id,
          outcomeId,
          price,
          amount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Order failed");
      }

      await refreshMe();

      setSuccess(`Order placed: BUY ${outcomeId}`);
    } catch (err: any) {
      if (err.message === "Unauthorized") {
        redirect("/login");
      } else {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8 text-white">Loading…</div>
    );
  }

  if (!market) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8 text-white">
        Market not found
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      {/* Market header */}
      <MarketCard market={market} marketStats={stats} />

      {/* Trading UI */}
      <div className="bg-blue-900 rounded-xl p-6 text-white space-y-4">
        <h2 className="text-lg font-bold">Place Order</h2>

        <div className="flex gap-4">
          <label className="flex flex-col text-sm">
            Price (0–1)
            {/* TEMP: price is manual, will be AMM-calculated */}
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="0.99"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="mt-1 px-3 py-2 rounded bg-blue-800 border border-blue-700"
            />
          </label>

          <label className="flex flex-col text-sm">
            Amount
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-1 px-3 py-2 rounded bg-blue-800 border border-blue-700"
            />
          </label>
        </div>

        <div className="flex gap-4">
          <button
            className="button-gold disabled:opacity-50"
            disabled={submitting}
            onClick={() => placeOrder("YES")}
          >
            Buy YES
          </button>

          <button
            className="button-gold disabled:opacity-50"
            disabled={submitting}
            onClick={() => placeOrder("NO")}
          >
            Buy NO
          </button>
        </div>

        {error && <p className="text-red-400">{error}</p>}
        {success && <p className="text-green-400">{success}</p>}
      </div>
    </div>
  );
}
