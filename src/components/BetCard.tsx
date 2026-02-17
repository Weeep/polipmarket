import { getSellDisplayMetricsFromBet } from "@/components/sellDisplay";
import { MyEventMarketBetDTO } from "@/modules/event/dto/myEventMarketBetDTO";

type BetCardProps = {
  market: MyEventMarketBetDTO;
  bet: MyEventMarketBetDTO["bets"][number];
  canSell: boolean;
  sellDialogLoading: boolean;
  onSell: () => void;
};

export function BetCard({ market, bet, canSell, sellDialogLoading, onSell }: BetCardProps) {
  const shares = bet.shares;
  const isCancelled = bet.status === "CANCELLED";
  const isFilled = bet.status === "FILLED";
  const isResolved = market.status === "RESOLVED";
  const isActive = bet.status === "OPEN";

  const resolvedPosition = market.resolvedPosition ?? null;
  const isWinning =
    isResolved &&
    market.resolvedOutcomeId === bet.outcomeId &&
    resolvedPosition === bet.position;
  const settlePrice = isResolved ? (isWinning ? 1 : 0) : bet.price;
  const payout = isResolved ? (isWinning ? shares * settlePrice : 0) : bet.amount;
  const profit = payout - bet.amount;
  const profitLabel =
    profit > 0 ? `+${profit.toFixed(2)}` : profit < 0 ? profit.toFixed(2) : "0";

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
    <div className="rounded-lg border border-stone-800 bg-stone-950/60 px-4 py-3 text-sm text-stone-300 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-base text-stone-100">{bet.outcomeLabel}</p>
          <p className="text-xs uppercase tracking-wide text-stone-400">{bet.position}</p>
        </div>

        {isActive && (
          <button
            className="button-gold px-3 py-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onSell}
            disabled={!canSell || sellDialogLoading}
            title={!canSell ? "Market closed" : undefined}
          >
            {sellDialogLoading ? "Számolás..." : "Sell"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm">
        <div>
          <p className="text-stone-500">Tét</p>
          <p>{bet.amount.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-stone-500">Ár</p>
          <p>@ {bet.price.toFixed(4)}</p>
        </div>
        <div>
          <p className="text-stone-500">Shares</p>
          <p>{shares.toFixed(2)}</p>
        </div>
      </div>

      {isFilled && (
        <p className="text-xs text-stone-400">
          Eladott {soldMetrics.shares.toFixed(2)} · Átlagár: {soldMetrics.executionPrice.toFixed(4)} · Nettó: {soldMetrics.netAmount.toFixed(2)}
        </p>
      )}

      {isCancelled && <p className="text-xs text-stone-400">Törölt megbízás</p>}

      {isResolved && (
        <p className="text-xs text-stone-400">
          Elszámolás: {payout.toFixed(2)}
          <span
            className={
              profit > 0 ? "text-emerald-400" : profit < 0 ? "text-rose-400" : "text-stone-400"
            }
          >
            {` (${profitLabel})`}
          </span>
        </p>
      )}
    </div>
  );
}
