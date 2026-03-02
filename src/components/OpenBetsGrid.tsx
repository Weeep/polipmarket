"use client";

import { useState } from "react";
import { BetCard } from "@/components/BetCard";
import { apiFetch } from "@/lib/apiFetch";
import { MyBetDTO } from "@/modules/event/dto/myBetDTO";
import type { QuoteSellResult } from "@/modules/order/application/quoteSell";

type SellDialogState = {
  bet: MyBetDTO;
  quote: QuoteSellResult;
};

type OpenBetsGridProps = {
  bets: MyBetDTO[];
  onUpdateBet: (lotId: string, updatedBet: MyBetDTO | null) => void;
  onSellSuccess?: () => Promise<void> | void;
  emptyMessage: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function OpenBetsGrid({
  bets,
  onUpdateBet,
  onSellSuccess,
  emptyMessage,
}: OpenBetsGridProps) {
  const [sellDialog, setSellDialog] = useState<SellDialogState | null>(null);
  const [sellDialogLoading, setSellDialogLoading] = useState(false);
  const [sellDialogError, setSellDialogError] = useState<string | null>(null);
  const [sellSubmitting, setSellSubmitting] = useState(false);

  async function openSellDialog(bet: MyBetDTO) {
    setSellDialogLoading(true);
    setSellDialogError(null);

    try {
      const quoteRes = await apiFetch(`/api/markets/${bet.marketId}/quote-sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcomeId: bet.outcomeId,
          position: bet.position,
          shares: bet.shares,
        }),
      });

      const quote = (await quoteRes.json()) as QuoteSellResult;
      setSellDialog({ bet, quote });
    } catch (err: unknown) {
      setSellDialogError(getErrorMessage(err, "Sell quote failed"));
    } finally {
      setSellDialogLoading(false);
    }
  }

  async function confirmSell() {
    if (!sellDialog) return;

    const { bet, quote } = sellDialog;

    try {
      setSellSubmitting(true);
      const res = await apiFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          marketId: bet.marketId,
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

      onUpdateBet(bet.lotId, {
        ...bet,
        status: "FILLED",
        soldAmount: typeof body.netAmount === "number" ? body.netAmount : bet.soldAmount,
        soldPrice:
          typeof body.executionPrice === "number" ? body.executionPrice : bet.soldPrice,
        soldShares: typeof body.shares === "number" ? body.shares : bet.soldShares,
        soldGrossAmount:
          typeof body.grossAmount === "number" ? body.grossAmount : bet.soldGrossAmount,
        soldFee: typeof body.feeAmount === "number" ? body.feeAmount : bet.soldFee,
        soldNetAmount:
          typeof body.netAmount === "number" ? body.netAmount : bet.soldNetAmount,
        soldAt: typeof body.createdAt === "string" ? body.createdAt : new Date().toISOString(),
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

  if (bets.length === 0) {
    return <p className="text-sm text-stone-400">{emptyMessage}</p>;
  }

  return (
    <>
      <div className="rounded-lg bg-stone-900 p-4">
        <div className="mx-auto flex max-w-[954px] flex-wrap gap-3">
          {bets.map((bet) => {
            const canSell =
              bet.marketStatus === "OPEN" && new Date(bet.closesAt) > new Date();

            return (
              <BetCard
                key={bet.lotId}
                bet={bet}
                canSell={canSell}
                sellDialogLoading={sellDialogLoading}
                onSell={() => openSellDialog(bet)}
              />
            );
          })}
        </div>
      </div>

      {sellDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-stone-700 bg-stone-900 p-4 space-y-4">
            <h3 className="text-lg font-semibold text-stone-100">Sell megerősítése</h3>

            {sellDialogError && (
              <p className="text-sm text-red-300">{sellDialogError}</p>
            )}

            <div className="space-y-1 text-sm text-stone-300">
              <p>
                <span className="text-stone-400">Market:</span> {sellDialog.bet.question}
              </p>
              <p>
                <span className="text-stone-400">Pozíció:</span> {sellDialog.bet.position}
              </p>
              <p>
                <span className="text-stone-400">Shares:</span> {sellDialog.quote.shares.toFixed(4)}
              </p>
              <p>
                <span className="text-stone-400">Átlagár:</span>{" "}
                {sellDialog.quote.executionPrice.toFixed(4)}
              </p>
              <p>
                <span className="text-stone-400">Bruttó:</span>{" "}
                {sellDialog.quote.grossAmount.toFixed(2)}ଳ
              </p>
              <p>
                <span className="text-stone-400">Díj:</span> {sellDialog.quote.fee.toFixed(2)}ଳ
              </p>
              <p>
                <span className="text-stone-400">Kifizetés:</span>{" "}
                {sellDialog.quote.netAmount.toFixed(2)}ଳ
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-2 rounded border border-stone-600 text-stone-200"
                onClick={() => setSellDialog(null)}
                disabled={sellSubmitting}
              >
                Mégse
              </button>
              <button
                className="button-gold px-4 py-2 disabled:opacity-50"
                onClick={confirmSell}
                disabled={sellSubmitting}
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
