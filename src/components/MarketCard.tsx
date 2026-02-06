"use client";

import Link from "next/link";
import { useState } from "react";
import { redirect } from "next/navigation";
import { Market, MarketStats, Outcome } from "@/modules/market/domain/Market";
import { apiFetch } from "@/lib/apiFetch";
import { DEFAULT_MAX_SLIPPAGE_BPS } from "@/config/economy";
import { useMe } from "@/context/MeContext";

type OutcomeWithPrices = Outcome & {
  yesPrice?: number;
  noPrice?: number;
};

type MarketCardMarket = Market & {
  outcomes?: OutcomeWithPrices[];
  marketStats?: MarketStats | null;
};

type Props = {
  market: MarketCardMarket;
  marketStats?: MarketStats | null;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function MarketCard({ market, marketStats }: Props) {
  const [amount, setAmount] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { refreshMe } = useMe();

  const stats = marketStats ?? market.marketStats;
  const outcomes = market.outcomes ?? [];
  const shouldShowOutcomes = market.outcomes != null;

  async function placeOrder(outcomeId: string, position: "YES" | "NO") {
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      await apiFetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketId: market.id,
          outcomeId,
          position,
          amount,
          maxSlippageBps: DEFAULT_MAX_SLIPPAGE_BPS,
        }),
      });

      await refreshMe();
      setSuccess(`Order placed: BUY ${position}`);
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

  return (
    <div key={market.id} className="marketcard-base space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={`/markets/${market.id}`} className="block">
            <h3 className="marketcard-question">{market.question}</h3>
          </Link>

          {market.description && (
            <p className="marketcard-description">{market.description}</p>
          )}
        </div>

        <Link href={`/markets/${market.id}`} className="button-gold">
          View market
        </Link>
      </div>

      <div className="marketcard-statusbar">
        <span>Status: {market.status}</span>
        <span>Closes: {new Date(market.closeAt).toLocaleString()}</span>
      </div>

      {stats && (
        <div className="marketcard-statusbar">
          Bets: {stats.totalMarketStats.totalBets} · Volume:{" "}
          {stats.totalMarketStats.totalVolume}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm text-white">
        <label className="flex items-center gap-2">
          Amount
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-24 px-2 py-1 rounded bg-blue-800 border border-blue-700"
          />
        </label>
      </div>

      {shouldShowOutcomes && (
        <div className="space-y-2">
          {outcomes.map((outcome) => (
            <div
              key={outcome.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-800/60 bg-blue-950/40 px-3 py-2"
            >
              <span className="text-white">{outcome.label}</span>
              <div className="flex flex-wrap gap-2">
                <button
                  className="button-gold disabled:opacity-50"
                  disabled={
                    submitting ||
                    amount <= 0 ||
                    market.status !== "OPEN" ||
                    outcome.yesPrice == null
                  }
                  onClick={() => placeOrder(outcome.id, "YES")}
                >
                  YES{" "}
                  {outcome.yesPrice != null
                    ? `(${outcome.yesPrice.toFixed(4)})`
                    : "(—)"}
                </button>
                <button
                  className="button-gold disabled:opacity-50"
                  disabled={
                    submitting ||
                    amount <= 0 ||
                    market.status !== "OPEN" ||
                    outcome.noPrice == null
                  }
                  onClick={() => placeOrder(outcome.id, "NO")}
                >
                  NO{" "}
                  {outcome.noPrice != null
                    ? `(${outcome.noPrice.toFixed(4)})`
                    : "(—)"}
                </button>
              </div>
            </div>
          ))}
          {outcomes.length === 0 && (
            <p className="text-sm text-blue-200">No outcomes available.</p>
          )}
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {success && <p className="text-green-400 text-sm">{success}</p>}
    </div>
  );
}
