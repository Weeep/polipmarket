"use client";

import { useState } from "react";
import { BetCard } from "@/components/BetCard";
import { apiFetch } from "@/lib/apiFetch";
import { MyEventMarketBetDTO } from "@/modules/event/dto/myEventMarketBetDTO";
import type { QuoteSellResult } from "@/modules/order/application/quoteSell";

type MarketBet = {
  market: MyEventMarketBetDTO;
  bet: MyEventMarketBetDTO["bets"][number];
};

type SellDialogState = {
  market: MyEventMarketBetDTO;
  bet: MyEventMarketBetDTO["bets"][number];
  quote: QuoteSellResult;
};

type OpenBetsGridProps = {
  markets: MyEventMarketBetDTO[];
  onUpdateMarket: (
    marketId: string,
    updatedMarket: MyEventMarketBetDTO | null,
  ) => void;
  onSellSuccess?: () => Promise<void> | void;
  emptyMessage: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

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

function flattenGroupedMarkets(groups: MyEventMarketBetDTO[][]): MarketBet[] {
  return groups.flatMap((groupMarkets) =>
    groupMarkets.flatMap((market) => market.bets.map((bet) => ({ market, bet }))),
  );
}

export function OpenBetsGrid({
  markets,
  onUpdateMarket,
  onSellSuccess,
  emptyMessage,
}: OpenBetsGridProps) {
  const [sellDialog, setSellDialog] = useState<SellDialogState | null>(null);
  const [sellDialogLoading, setSellDialogLoading] = useState(false);
  const [sellDialogError, setSellDialogError] = useState<string | null>(null);
  const [sellSubmitting, setSellSubmitting] = useState(false);

  const openBets = flattenGroupedMarkets(groupMarketsByEvent(markets));

  async function openSellDialog(
    market: MyEventMarketBetDTO,
    bet: MyEventMarketBetDTO["bets"][number],
  ) {
    setSellDialogLoading(true);
    setSellDialogError(null);

    try {
      const quoteRes = await apiFetch(`/api/markets/${market.marketId}/quote-sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcomeId: bet.outcomeId,
          position: bet.position,
          shares: bet.shares,
        }),
      });

      const quote = (await quoteRes.json()) as QuoteSellResult;
      setSellDialog({ market, bet, quote });
    } catch (err: unknown) {
      setSellDialogError(getErrorMessage(err, "Sell quote failed"));
    } finally {
      setSellDialogLoading(false);
    }
  }

  async function confirmSell() {
    if (!sellDialog) return;

    const { market, bet, quote } = sellDialog;

    try {
      setSellSubmitting(true);
      const res = await apiFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          marketId: market.marketId,
          outcomeId: bet.outcomeId,
          position: bet.position,
          side: "SELL",
          shares: quote.shares,
          lotId: bet.lotId,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Sell failed");
      }

      onUpdateMarket(market.marketId, {
        ...market,
        bets: market.bets.map((currentBet) =>
          currentBet.lotId === bet.lotId
            ? {
                ...currentBet,
                status: "FILLED",
                soldAmount:
                  typeof body.netAmount === "number"
                    ? body.netAmount
                    : currentBet.soldAmount,
                soldPrice:
                  typeof body.executionPrice === "number"
                    ? body.executionPrice
                    : currentBet.soldPrice,
                soldShares:
                  typeof body.shares === "number"
                    ? body.shares
                    : currentBet.soldShares,
                soldGrossAmount:
                  typeof body.grossAmount === "number"
                    ? body.grossAmount
                    : currentBet.soldGrossAmount,
                soldFee:
                  typeof body.feeAmount === "number"
                    ? body.feeAmount
                    : currentBet.soldFee,
                soldNetAmount:
                  typeof body.netAmount === "number"
                    ? body.netAmount
                    : currentBet.soldNetAmount,
                soldAt:
                  typeof body.createdAt === "string"
                    ? body.createdAt
                    : new Date().toISOString(),
              }
            : currentBet,
        ),
      });

      await onSellSuccess?.();
      setSellDialog(null);
      setSellDialogError(null);
    } catch (err: unknown) {
      alert(getErrorMessage(err, "Sell failed"));
    } finally {
      setSellSubmitting(false);
    }
  }

  if (openBets.length === 0) {
    return <p className="text-sm text-stone-400">{emptyMessage}</p>;
  }

  return (
    <>
      <div className="rounded-lg bg-stone-900 p-4">
        <div className="mx-auto flex max-w-[954px] flex-wrap gap-3">
          {openBets.map(({ market, bet }) => {
            const canSell =
              market.status === "OPEN" && new Date(market.closesAt) > new Date();

            return (
              <BetCard
                key={bet.lotId}
                market={market}
                bet={bet}
                canSell={canSell}
                sellDialogLoading={sellDialogLoading}
                onSell={() => {
                  if (!canSell || sellDialogLoading) return;
                  openSellDialog(market, bet);
                }}
              />
            );
          })}

          {sellDialogError && (
            <p className="w-full text-right text-xs text-rose-400">{sellDialogError}</p>
          )}
        </div>
      </div>

      {sellDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl border border-stone-700 bg-stone-900 p-5 text-stone-200 shadow-2xl">
            <h3 className="mb-3 text-lg font-bold text-stone-100">
              Eladás megerősítése
            </h3>
            <div className="space-y-1 text-sm">
              <p>
                Részvények: <span className="font-semibold">{sellDialog.quote.shares.toFixed(2)}</span>
              </p>
              <p>
                Várható átlagár: <span className="font-semibold">{sellDialog.quote.executionPrice.toFixed(4)}</span>
              </p>
              <p>
                Várható bruttó bevétel: <span className="font-semibold">{sellDialog.quote.grossAmount.toFixed(2)}</span>
              </p>
              <p>
                Fee: <span className="font-semibold">{sellDialog.quote.fee.toFixed(2)}</span>
              </p>
              <p>
                Kézhez kapott összeg: <span className="font-semibold text-emerald-400">{sellDialog.quote.netAmount.toFixed(2)}</span>
              </p>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSellDialog(null)}
                disabled={sellSubmitting}
                className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 font-semibold text-stone-100 hover:bg-slate-700 disabled:opacity-50"
              >
                MÉGSEM
              </button>
              <button
                type="button"
                onClick={confirmSell}
                disabled={sellSubmitting}
                className="button-gold disabled:opacity-50"
              >
                {sellSubmitting ? "Folyamatban..." : "MEHET"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
