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
  const presetAmounts = [10, 50, 100, 200];
  const [amount, setAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { refreshMe } = useMe();

  const stats = marketStats ?? market.marketStats;
  const outcomes: OutcomeWithPrices[] = market.outcomes ?? [];
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
    <div key={market.id} className="marketcard-base space-y-4 mb-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={`/markets/${market.id}`} className="block">
            <h3 className="marketcard-question">{market.question}</h3>
          </Link>

          {market.description && (
            <p className="marketcard-description">{market.description}</p>
          )}
        </div>
      </div>

      <div className="marketcard-amount">
        <span className="marketcard-amount-label">Amount</span>
        <div className="marketcard-amount-bar">
          {presetAmounts.map((value) => (
            <button
              key={value}
              type="button"
              data-active={!isCustomAmount && amount === value}
              className="marketcard-amount-option"
              onClick={() => {
                setAmount(value);
                setIsCustomAmount(false);
                setCustomAmount("");
              }}
            >
              {value}
            </button>
          ))}
          <input
            type="number"
            min="1"
            value={customAmount}
            placeholder="Custom"
            onFocus={() => setIsCustomAmount(true)}
            onChange={(e) => {
              const nextValue = e.target.value;
              setCustomAmount(nextValue);
              setIsCustomAmount(true);
              setAmount(Number(nextValue));
            }}
            data-active={isCustomAmount}
            className="marketcard-amount-input"
          />
        </div>
      </div>

      {shouldShowOutcomes && (
        <div className="space-y-2">
          {outcomes.map((outcome) => (
            <div key={outcome.id} className="marketcard-outcome">
              <span className="marketcard-outcome-label">{outcome.label}</span>
              <div className="flex flex-wrap gap-3">
                <button
                  className="marketcard-yes-button disabled:opacity-50"
                  disabled={
                    submitting ||
                    amount <= 0 ||
                    market.status !== "OPEN" ||
                    outcome.yesPrice == null
                  }
                  onClick={() => placeOrder(outcome.id, "YES")}
                >
                  <span>YES&nbsp;</span>
                  <span className="marketcard-price">
                    {outcome.yesPrice != null
                      ? `(${outcome.yesPrice.toFixed(2)})`
                      : "(—)"}
                  </span>
                </button>
                <button
                  className="marketcard-no-button disabled:opacity-50"
                  disabled={
                    submitting ||
                    amount <= 0 ||
                    market.status !== "OPEN" ||
                    outcome.noPrice == null
                  }
                  onClick={() => placeOrder(outcome.id, "NO")}
                >
                  <span>NO&nbsp;</span>
                  <span className="marketcard-price">
                    {outcome.noPrice != null
                      ? `(${outcome.noPrice.toFixed(2)})`
                      : "(—)"}
                  </span>
                </button>
              </div>
            </div>
          ))}
          {outcomes.length === 0 && (
            <p className="text-sm text-blue-200">No outcomes available.</p>
          )}
        </div>
      )}

      {stats && (
        <div className="marketcard-statusbar justify-center">
          Bets: {stats.totalMarketStats.totalBets} · Volume:{" "}
          {stats.totalMarketStats.totalVolume}
        </div>
      )}

      <div className="marketcard-statusbar">
        <span>Status: {market.status}</span>
        <span>Closes: {new Date(market.bettingCloseAt).toLocaleString()}</span>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {success && <p className="text-green-400 text-sm">{success}</p>}
    </div>
  );
}
