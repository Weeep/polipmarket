import { useState } from "react";
import { useMe } from "@/context/MeContext";
import { apiFetch } from "@/lib/apiFetch";
import { MyEventMarketBetDTO } from "@/modules/event/dto/myEventMarketBetDTO";
import type { QuoteSellResult } from "@/modules/order/application/quoteSell";
import { BetCard } from "@/components/BetCard";

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
        <div className="space-y-2">
          {allBets.map(({ market, bet }) => {
            const isActive = bet.status === "OPEN";
            const canSell =
              isActive && market.status === "OPEN" && new Date(market.closesAt) > new Date();

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
            <p className="text-xs text-rose-400 text-right">{sellDialogError}</p>
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
