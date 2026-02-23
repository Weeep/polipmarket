"use client";

import { useEffect, useState } from "react";
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

type BuyDialogState = {
  marketId: string;
  outcomeId: string;
  position: "YES" | "NO";
  quote: QuoteOrderResult;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatVolume(value: number) {
  return Math.round(value).toLocaleString("hu-HU");
}

export function EventCard({ event }: Props) {
  const presetAmounts = [10, 50, 100, 200];
  const [eventData, setEventData] = useState(event);
  const [amount, setAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [buyDialogLoading, setBuyDialogLoading] = useState(false);
  const [buyDialog, setBuyDialog] = useState<BuyDialogState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { refreshMe } = useMe();

  useEffect(() => {
    setEventData(event);
  }, [event]);

  async function refreshEventCard() {
    const res = await apiFetch(`/api/events/${event.id}`);
    if (!res.ok) {
      throw new Error("Failed to refresh event");
    }

    const refreshedEvent = (await res.json()) as EventSummary;
    setEventData(refreshedEvent);
  }

  async function openBuyDialog(
    marketId: string,
    outcomeId: string,
    position: "YES" | "NO",
  ) {
    try {
      setBuyDialogLoading(true);
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
      const quote = (await quoteRes.json()) as QuoteOrderResult;
      setBuyDialog({ marketId, outcomeId, position, quote });
    } catch (err: unknown) {
      const message = getErrorMessage(err, "Order failed");
      if (message === "Unauthorized") {
        redirect("/about");
      } else {
        setError(message);
      }
    } finally {
      setBuyDialogLoading(false);
    }
  }

  async function placeOrder() {
    if (!buyDialog) {
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
          marketId: buyDialog.marketId,
          outcomeId: buyDialog.outcomeId,
          position: buyDialog.position,
          amount: buyDialog.quote.amount,
          maxSlippageBps: DEFAULT_MAX_SLIPPAGE_BPS,
        }),
      });

      window.dispatchEvent(new Event("achievements:refresh-unread"));

      await Promise.all([refreshMe(), refreshEventCard()]);
      setSuccess(
        `Pontosan ${buyDialog.quote.amount.toFixed(2)} összegért, ${buyDialog.quote.executionPrice.toFixed(4)} átlagáron, ${buyDialog.quote.estimatedShares.toFixed(2)} darab részvényt vettél (${buyDialog.position}), Fee: ${buyDialog.quote.fee.toFixed(2)}`,
      );
      setBuyDialog(null);
    } catch (err: unknown) {
      const message = getErrorMessage(err, "Order failed");
      if (message === "Unauthorized") {
        redirect("/about");
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const winProfit = buyDialog
    ? Math.max(buyDialog.quote.estimatedShares - buyDialog.quote.amount, 0)
    : 0;

  return (
    <>
      <section className="marketcard-base space-y-6">
        <div className="space-y-2">
          <Link
            href={`/events/${eventData.id}`}
            className="block marketcard-question hover:underline"
          >
            {eventData.question}
          </Link>
          {eventData.description && (
            <p className="marketcard-description">{eventData.description}</p>
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
          {eventData.markets.map((market) => {
            const outcome = market.outcomes?.[0];
            const marketStats = market.marketStats?.totalMarketStats;
            return (
              <div
                key={market.id}
                className="marketcard-outcome flex flex-wrap items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="marketcard-outcome-label">{market.question}</div>
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
                        buyDialogLoading ||
                        amount <= 0 ||
                        market.status !== "OPEN" ||
                        outcome?.yesPrice == null ||
                        !outcome
                      }
                      onClick={() =>
                        outcome && openBuyDialog(market.id, outcome.id, "YES")
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
                        buyDialogLoading ||
                        amount <= 0 ||
                        market.status !== "OPEN" ||
                        outcome?.noPrice == null ||
                        !outcome
                      }
                      onClick={() =>
                        outcome && openBuyDialog(market.id, outcome.id, "NO")
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
                      Bets: {marketStats.totalBets} · Volume: {" "}
                      {formatVolume(marketStats.totalVolume)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {eventData.eventStats && (
          <div className="marketcard-statusbar justify-center">
            Bets: {eventData.eventStats.totalBets} · Volume: {" "}
            {formatVolume(eventData.eventStats.totalVolume)}
          </div>
        )}

        <div className="marketcard-statusbar">
          <span>
            Fogadás zár: {new Date(eventData.bettingCloseAt).toLocaleString()}
          </span>
          {eventData.resolveAt && (
            <span>
              Esemény vége: {new Date(eventData.resolveAt).toLocaleString()}
            </span>
          )}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {success && <p className="text-green-400 text-sm">{success}</p>}
      </section>

      {buyDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl border border-stone-700 bg-stone-900 p-5 text-stone-200 shadow-2xl">
            <h3 className="mb-3 text-lg font-bold text-stone-100">Vásárlás megerősítése</h3>
            <div className="space-y-1 text-sm">
              <p>Összeg: <span className="font-semibold">{buyDialog.quote.amount.toFixed(2)}</span></p>
              <p>Várható átlagár: <span className="font-semibold">{buyDialog.quote.executionPrice.toFixed(4)}</span></p>
              <p>Várható részvény db: <span className="font-semibold">{buyDialog.quote.estimatedShares.toFixed(2)}</span></p>
              <p>Pozíció: <span className="font-semibold">{buyDialog.position}</span></p>
              <p>Fee: <span className="font-semibold">{buyDialog.quote.fee.toFixed(2)}</span></p>
              <p>Nyereség (ha nyer): <span className="font-semibold text-emerald-400">{winProfit.toFixed(2)}</span></p>
              <p>Veszteség (ha veszít): <span className="font-semibold text-rose-400">{buyDialog.quote.amount.toFixed(2)}</span></p>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setBuyDialog(null)}
                disabled={submitting}
                className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 font-semibold text-stone-100 hover:bg-slate-700 disabled:opacity-50"
              >
                MÉGSEM
              </button>
              <button
                type="button"
                onClick={placeOrder}
                disabled={submitting}
                className="button-gold disabled:opacity-50"
              >
                {submitting ? "Folyamatban..." : "MEHET"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
