import { useState } from "react";
import Link from "next/link";
import { useMe } from "@/context/MeContext";
import { apiFetch } from "@/lib/apiFetch";
import { MyEventMarketBetDTO } from "@/modules/event/dto/myEventMarketBetDTO";
import type { QuoteSellResult } from "@/modules/order/application/quoteSell";
import { getSellDisplayMetricsFromBet } from "@/components/sellDisplay";

type Props = {
  markets: MyEventMarketBetDTO[];
  onUpdateMarket: (marketId: string, updatedMarket: MyEventMarketBetDTO | null) => void;
};

type MarketBet = {
  market: MyEventMarketBetDTO;
  bet: MyEventMarketBetDTO["bets"][number];
};

type SellDialogState = {
  market: MyEventMarketBetDTO;
  bet: MyEventMarketBetDTO["bets"][number];
  quote: QuoteSellResult;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function EventMarketGroup({ markets, onUpdateMarket }: Props) {
  const { refreshMe } = useMe();
  const [sellDialog, setSellDialog] = useState<SellDialogState | null>(null);
  const [sellDialogLoading, setSellDialogLoading] = useState(false);
  const [sellDialogError, setSellDialogError] = useState<string | null>(null);
  const [sellSubmitting, setSellSubmitting] = useState(false);

  const eventId = markets[0]?.eventId;
  const eventQuestion = markets[0]?.eventQuestion;

  const allBets: MarketBet[] = markets.flatMap((market) =>
    market.bets.map((bet) => ({ market, bet })),
  );

  async function openSellDialog(market: MyEventMarketBetDTO, bet: MarketBet["bet"]) {
    const shares = bet.shares;
    setSellDialogLoading(true);
    setSellDialogError(null);

    try {
      const quoteRes = await apiFetch(`/api/markets/${market.marketId}/quote-sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcomeId: bet.outcomeId,
          position: bet.position,
          shares,
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
                  typeof quote.netAmount === "number"
                    ? quote.netAmount
                    : currentBet.soldAmount,
                soldPrice:
                  typeof quote.executionPrice === "number"
                    ? quote.executionPrice
                    : currentBet.soldPrice,
                soldShares:
                  typeof quote.shares === "number"
                    ? quote.shares
                    : currentBet.soldShares,
                soldGrossAmount:
                  typeof quote.grossAmount === "number"
                    ? quote.grossAmount
                    : currentBet.soldGrossAmount,
                soldFee:
                  typeof quote.fee === "number"
                    ? quote.fee
                    : currentBet.soldFee,
                soldNetAmount:
                  typeof quote.netAmount === "number"
                    ? quote.netAmount
                    : currentBet.soldNetAmount,
                soldAt:
                  typeof body.createdAt === "string"
                    ? body.createdAt
                    : new Date().toISOString(),
              }
            : currentBet,
        ),
      });

      await refreshMe();
      setSellDialog(null);
      setSellDialogError(null);
    } catch (err: unknown) {
      alert(getErrorMessage(err, "Sell failed"));
    } finally {
      setSellSubmitting(false);
    }
  }

  return (
    <>
      <div className="bg-stone-900 rounded-lg p-4 space-y-3">
        {eventId && eventQuestion ? (
          <Link
            href={`/events/${eventId}`}
            className="block marketcard-question hover:underline"
          >
            {eventQuestion}
          </Link>
        ) : (
          <p className="block marketcard-question">{markets[0]?.question}</p>
        )}

        <div className="space-y-2">
          <div className="grid grid-cols-[1.6fr_0.8fr_0.7fr_0.7fr_0.8fr_1fr] text-xs uppercase tracking-wide text-stone-500">
            <span>Kimenet</span>
            <span>Yes/No</span>
            <span>Tét</span>
            <span>Ár</span>
            <span>Shares</span>
            <span>Állapot</span>
          </div>

          {allBets.map(({ market, bet }) => {
            const shares = bet.shares;
            const isCancelled = bet.status === "CANCELLED";
            const isFilled = bet.status === "FILLED";
            const isResolved = market.status === "RESOLVED";
            const isActive = bet.status === "OPEN";
            const canSell =
              isActive && market.status === "OPEN" && new Date(market.closesAt) > new Date();
            const resolvedPosition = market.resolvedPosition ?? null;
            const statusLabel = isCancelled ? "Törölt" : isFilled ? "Eladott" : isResolved ? "Lezárt" : "Aktív";
            const isWinning =
              isResolved &&
              market.resolvedOutcomeId === bet.outcomeId &&
              resolvedPosition === bet.position;
            const sellPrice = isResolved ? (isWinning ? 1 : 0) : bet.price;
            const payout = isResolved ? (isWinning ? shares * sellPrice : 0) : bet.amount;
            const profit = payout - bet.amount;
            const profitLabel =
              profit > 0 ? `+${profit.toFixed(2)}` : profit < 0 ? profit.toFixed(2) : "0";
            const payoutLabel = payout.toFixed(2);
            const soldMetrics = getSellDisplayMetricsFromBet({
              shares,
              soldPrice: bet.soldPrice,
              soldShares: bet.soldShares,
              soldGrossAmount: bet.soldGrossAmount,
              soldFee: bet.soldFee,
              soldNetAmount: bet.soldNetAmount,
              soldAmount: bet.soldAmount,
              amount: bet.amount,
            });

            return (
              <div
                key={bet.lotId}
                className="grid grid-cols-[1.6fr_0.8fr_0.7fr_0.7fr_0.8fr_1fr] items-center gap-2 rounded-md border border-stone-800 bg-stone-950/60 px-3 py-2 text-sm text-stone-300"
              >
                <span className="font-semibold text-stone-100">{bet.outcomeLabel}</span>
                <span className="text-stone-200">{bet.position}</span>
                <span>{bet.amount.toFixed(2)}</span>
                <span>@ {bet.price.toFixed(4)}</span>
                <span>{shares.toFixed(2)}</span>
                <div className="flex flex-col items-end gap-1 text-right">
                  <span
                    className={
                      isActive
                        ? "text-emerald-400"
                        : isCancelled
                          ? "text-amber-400"
                          : "text-sky-400"
                    }
                  >
                    {statusLabel}
                  </span>
                  {isActive && (
                    <button
                      className="button-gold px-3 py-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!canSell || sellDialogLoading) return;
                        openSellDialog(market, bet);
                      }}
                      disabled={!canSell || sellDialogLoading}
                      title={!canSell ? "Market closed" : undefined}
                    >
                      {sellDialogLoading ? "Számolás..." : "Sell"}
                    </button>
                  )}
                  {isFilled && (
                    <span className="text-xs text-stone-400">
                      Eladott {soldMetrics.shares.toFixed(2)} · Átlagár: {soldMetrics.executionPrice.toFixed(4)} · Bruttó: {soldMetrics.grossAmount.toFixed(2)} · Fee: {soldMetrics.fee.toFixed(2)} · Nettó: {soldMetrics.netAmount.toFixed(2)}
                    </span>
                  )}
                  {isCancelled && (
                    <span className="text-xs text-stone-400">Törölt megbízás</span>
                  )}
                  {isResolved && (
                    <span className="text-xs text-stone-400">
                      Eladott {bet.amount.toFixed(2)} @ {sellPrice.toFixed(2)} · {payoutLabel}{" "}
                      <span
                        className={
                          profit > 0
                            ? "text-emerald-400"
                            : profit < 0
                              ? "text-rose-400"
                              : "text-stone-400"
                        }
                      >
                        ({profitLabel})
                      </span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {sellDialogError && (
            <p className="text-xs text-rose-400 text-right">{sellDialogError}</p>
          )}
        </div>

        <div className="marketcard-statusbar text-stone-400">
          <span>{markets[0]?.status}</span>
          <span>Fogadás zár {new Date(markets[0]?.closesAt).toLocaleDateString()}</span>
          {markets[0]?.resolvesAt && (
            <span>Esemény vége {new Date(markets[0].resolvesAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>

      {sellDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl border border-stone-700 bg-stone-900 p-5 text-stone-200 shadow-2xl">
            <h3 className="text-lg font-bold text-stone-100 mb-3">Eladás megerősítése</h3>
            <div className="space-y-1 text-sm">
              <p>Részvények: <span className="font-semibold">{sellDialog.quote.shares.toFixed(2)}</span></p>
              <p>Várható átlagár: <span className="font-semibold">{sellDialog.quote.executionPrice.toFixed(4)}</span></p>
              <p>Várható bruttó bevétel: <span className="font-semibold">{sellDialog.quote.grossAmount.toFixed(2)}</span></p>
              <p>Fee: <span className="font-semibold">{sellDialog.quote.fee.toFixed(2)}</span></p>
              <p>Kézhez kapott összeg: <span className="font-semibold text-emerald-400">{sellDialog.quote.netAmount.toFixed(2)}</span></p>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSellDialog(null)}
                disabled={sellSubmitting}
                className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-stone-100 border border-slate-600 hover:bg-slate-700 disabled:opacity-50"
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
