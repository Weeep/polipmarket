"use client";

import { useState } from "react";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { DEFAULT_MAX_SLIPPAGE_BPS } from "@/config/economy";
import { useMe } from "@/context/MeContext";
import { QuoteOrderResult } from "@/modules/order/application/quoteOrder";
import type { EventSummary } from "@/modules/event/domain/Event";
import Link from "next/link";

type Props = {
  event: EventSummary;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function EventCard({ event }: Props) {
  const presetAmounts = [10, 50, 100, 200];
  const [amount, setAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { refreshMe } = useMe();

  async function placeOrder(
    marketId: string,
    outcomeId: string,
    position: "YES" | "NO",
  ) {
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const quoteRes = await apiFetch(`/api/markets/${marketId}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcomeId,
          position,
          amount,
        }),
      });
      const quoteData = (await quoteRes.json()) as QuoteOrderResult;

      await apiFetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketId,
          outcomeId,
          position,
          amount,
          maxSlippageBps: DEFAULT_MAX_SLIPPAGE_BPS,
        }),
      });

      await refreshMe();
      setSuccess(
        `Pontosan ${quoteData.amount.toFixed(2)} összegért, ${quoteData.executionPrice.toFixed(4)} átlagáron, ${quoteData.estimatedShares.toFixed(2)} darab részvényt vettél (${position}), Fee: ${quoteData.fee.toFixed(2)}`,
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

  return (
    <section className="marketcard-base space-y-6">
      <div className="space-y-2">
        <Link
          href={`/events/${event.id}`}
          className="block marketcard-question hover:underline"
        >
          {event.question}
        </Link>
        {event.description && (
          <p className="marketcard-description">{event.description}</p>
        )}
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

      <div className="space-y-3">
        {event.markets.map((market) => {
          const outcome = market.outcomes?.[0];
          const marketStats = market.marketStats?.totalMarketStats;
          return (
            <div
              key={market.id}
              className="marketcard-outcome flex flex-wrap items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="marketcard-outcome-label">
                  {market.question}
                </div>
                <div className="text-xs uppercase text-stone-400">
                  {market.status}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-wrap gap-3">
                  <button
                    className="marketcard-yes-button disabled:opacity-50"
                    disabled={
                      submitting ||
                      amount <= 0 ||
                      market.status !== "OPEN" ||
                      outcome?.yesPrice == null ||
                      !outcome
                    }
                    onClick={() =>
                      outcome && placeOrder(market.id, outcome.id, "YES")
                    }
                  >
                    <span>YES&nbsp;</span>
                    <span className="marketcard-price">
                      {outcome?.yesPrice != null
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
                      outcome?.noPrice == null ||
                      !outcome
                    }
                    onClick={() =>
                      outcome && placeOrder(market.id, outcome.id, "NO")
                    }
                  >
                    <span>NO&nbsp;</span>
                    <span className="marketcard-price">
                      {outcome?.noPrice != null
                        ? `(${outcome.noPrice.toFixed(2)})`
                        : "(—)"}
                    </span>
                  </button>
                </div>

                {marketStats && (
                  <div className="text-xs text-stone-300">
                    Bets: {marketStats.totalBets} · Volume:{" "}
                    {marketStats.totalVolume}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {event.eventStats && (
        <div className="marketcard-statusbar justify-center">
          Bets: {event.eventStats.totalBets} · Volume:{" "}
          {event.eventStats.totalVolume}
        </div>
      )}

      <div className="marketcard-statusbar">
        <span>
          Fogadás zár: {new Date(event.bettingCloseAt).toLocaleString()}
        </span>
        {event.resolveAt && (
          <span>
            Esemény vége: {new Date(event.resolveAt).toLocaleString()}
          </span>
        )}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {success && <p className="text-green-400 text-sm">{success}</p>}
    </section>
  );
}
