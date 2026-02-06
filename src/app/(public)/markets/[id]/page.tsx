"use client";

import { useEffect, useMemo, useState } from "react";
import { redirect, useParams } from "next/navigation";
import { MarketCard } from "@/components/MarketCard";
import { Market, MarketStats, Outcome } from "@/modules/market/domain/Market";
import { OrderPosition } from "@/modules/order/domain/Order";
import { useMe } from "@/context/MeContext";
import { apiFetch } from "@/lib/apiFetch";
import { QuoteOrderResult } from "@/modules/order/application/quoteOrder";
import { DEFAULT_MAX_SLIPPAGE_BPS } from "@/config/economy";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function MarketDetailPage() {
  const { id } = useParams<{ id: string }>();

  type OutcomeWithPrices = Outcome & {
    yesPrice?: number;
    noPrice?: number;
  };
  type MarketWithExtras = Market & {
    outcomes?: OutcomeWithPrices[];
    marketStats?: MarketStats | null;
  };

  const [market, setMarket] = useState<MarketWithExtras | null>(null);
  const [outcomes, setOutcomes] = useState<OutcomeWithPrices[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string>("");
  const [position, setPosition] = useState<OrderPosition>("YES");
  const [amount, setAmount] = useState(10);
  const [maxSlippageBps, setMaxSlippageBps] = useState(
    DEFAULT_MAX_SLIPPAGE_BPS,
  );
  const [quote, setQuote] = useState<QuoteOrderResult | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { refreshMe } = useMe();

  useEffect(() => {
    setLoading(true);

    apiFetch(`/api/markets/${id}?include=outcomes,prices,stats`)
      .then((r) => r.json() as Promise<MarketWithExtras>)
      .then((marketData) => {
        setMarket(marketData);
        const outcomesData = marketData.outcomes ?? [];
        setOutcomes(outcomesData);
        if (outcomesData.length > 0) {
          setSelectedOutcomeId(outcomesData[0].id);
        }
      })
      .catch((err: unknown) => {
        setError(getErrorMessage(err, "Failed to load market data"));
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!selectedOutcomeId || amount <= 0) {
      setQuote(null);
      return;
    }

    let cancelled = false;
    setQuoteLoading(true);

    apiFetch(`/api/markets/${id}/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outcomeId: selectedOutcomeId,
        position,
        amount,
      }),
    })
      .then((r) => r.json() as Promise<QuoteOrderResult>)
      .then((quoteData) => {
        if (!cancelled) {
          setQuote(quoteData);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQuote(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setQuoteLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [amount, id, position, selectedOutcomeId]);

  const selectedOutcome = useMemo(
    () => outcomes.find((o) => o.id === selectedOutcomeId) ?? null,
    [outcomes, selectedOutcomeId],
  );

  async function placeOrder() {
    if (!selectedOutcomeId) {
      setError("Please select an outcome");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      await apiFetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketId: id,
          outcomeId: selectedOutcomeId,
          position,
          amount,
          maxSlippageBps,
        }),
      });

      await refreshMe();
      setSuccess(
        `Order placed: BUY ${position}${selectedOutcome ? ` (${selectedOutcome.label})` : ""}`,
      );
    } catch (err: unknown) {
      const message = getErrorMessage(err, "Order failed");
      if (message === "Unauthorized") {
        redirect("/login");
      } else {
        setError(message);
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
      <MarketCard market={market} marketStats={market.marketStats} />

      <div className="bg-blue-900 rounded-xl p-6 text-white space-y-4">
        <h2 className="text-lg font-bold">Place Order</h2>

        <label className="flex flex-col text-sm gap-1">
          Outcome
          <select
            value={selectedOutcomeId}
            onChange={(e) => setSelectedOutcomeId(e.target.value)}
            className="px-3 py-2 rounded bg-blue-800 border border-blue-700"
          >
            {outcomes.map((outcome) => (
              <option key={outcome.id} value={outcome.id}>
                {outcome.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-2">
          <button
            className={`button-gold disabled:opacity-50 ${position === "YES" ? "ring-2 ring-white" : "opacity-80"}`}
            disabled={submitting}
            onClick={() => setPosition("YES")}
          >
            YES
          </button>
          <button
            className={`button-gold disabled:opacity-50 ${position === "NO" ? "ring-2 ring-white" : "opacity-80"}`}
            disabled={submitting}
            onClick={() => setPosition("NO")}
          >
            NO
          </button>
        </div>

        <div className="flex gap-4">
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

          <label className="flex flex-col text-sm">
            Max slippage (bps)
            <input
              type="number"
              min="0"
              value={maxSlippageBps}
              onChange={(e) => setMaxSlippageBps(Number(e.target.value))}
              className="mt-1 px-3 py-2 rounded bg-blue-800 border border-blue-700"
            />
          </label>
        </div>

        <div className="rounded-lg bg-blue-950 border border-blue-800 p-3 text-sm space-y-1">
          {quoteLoading && <p>Loading quote…</p>}
          {!quoteLoading && quote && (
            <>
              <p>Estimated price: {quote.executionPrice.toFixed(4)}</p>
              <p>Estimated fee: {quote.fee.toFixed(2)}</p>
              <p>Estimated shares: {quote.estimatedShares.toFixed(4)}</p>
              <p>Slippage: {quote.slippageBps.toFixed(2)} bps</p>
            </>
          )}
          {!quoteLoading && !quote && (
            <p className="text-blue-200">
              Quote unavailable for current input.
            </p>
          )}
        </div>

        <button
          className="button-gold disabled:opacity-50"
          disabled={submitting || !selectedOutcomeId || !quote || amount <= 0}
          onClick={placeOrder}
        >
          {submitting
            ? "Placing order…"
            : `Buy ${position}${selectedOutcome ? ` on ${selectedOutcome.label}` : ""}`}
        </button>

        {error && <p className="text-red-400">{error}</p>}
        {success && <p className="text-green-400">{success}</p>}
      </div>
    </div>
  );
}
