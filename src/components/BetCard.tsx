import Link from "next/link";
import { getSellDisplayMetricsFromBet } from "@/components/sellDisplay";
import { getRemainingTimeInfo } from "@/lib/remainingTime";
import { toHun } from "@/lib/logger";
import { MyBetDTO } from "@/modules/event/dto/myBetDTO";
import { MyEventMarketBetDTO } from "@/modules/event/dto/myEventMarketBetDTO";

type MarketSummary = Pick<
  MyEventMarketBetDTO,
  "eventId" | "eventQuestion" | "question" | "closesAt" | "status" | "resolvedOutcomeId" | "resolvedPosition"
>;

type EventMarketBet = MyEventMarketBetDTO["bets"][number];

type BetCardProps = {
  bet: MyBetDTO | EventMarketBet;
  market?: MarketSummary;
  canSell: boolean;
  sellDialogLoading: boolean;
  onSell: () => void;
};

export function BetCard({
  bet,
  market,
  canSell,
  sellDialogLoading,
  onSell,
}: BetCardProps) {
  const shares = bet.shares;
  const isCancelled = bet.status === "CANCELLED";
  const isFilled = bet.status === "FILLED";
  const marketStatus = market?.status ?? ("marketStatus" in bet ? bet.marketStatus : undefined);
  const isResolved = marketStatus === "RESOLVED";
  const isActive = bet.status === "OPEN";
  const closesAt = market?.closesAt ?? ("closesAt" in bet ? bet.closesAt : null);
  const closeTime = getRemainingTimeInfo(closesAt ?? new Date().toISOString());

  const resolvedPosition = market?.resolvedPosition ?? ("resolvedPosition" in bet ? bet.resolvedPosition : null);
  const resolvedOutcomeId = market?.resolvedOutcomeId ?? ("resolvedOutcomeId" in bet ? bet.resolvedOutcomeId : null);
  const isWinning =
    isResolved &&
    resolvedOutcomeId === bet.outcomeId &&
    resolvedPosition === bet.position;
  const settlePrice = isResolved ? (isWinning ? 1 : 0) : bet.price;
  const payout = isResolved
    ? isWinning
      ? shares * settlePrice
      : 0
    : bet.amount;
  const resolvedEventProfit = payout - bet.amount;
  const resolvedEventProfitLabel =
    resolvedEventProfit > 0
      ? `+${resolvedEventProfit.toFixed(2)}`
      : resolvedEventProfit < 0
        ? resolvedEventProfit.toFixed(2)
        : "0";

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

  const selledShareProfit = soldMetrics.netAmount - bet.amount;
  const selledShareProfitLabel =
    selledShareProfit > 0
      ? `+${selledShareProfit.toFixed(2)}ଳ`
      : selledShareProfit < 0
        ? `${selledShareProfit.toFixed(2)}ଳ`
        : "0ଳ";

  return (
    <div className="w-[310px] rounded-lg border border-stone-800 bg-stone-950/60 px-4 py-3 text-sm text-stone-300 space-y-3">
      <div className="space-y-2">
        {(market?.eventId ?? ("eventId" in bet ? bet.eventId : undefined)) &&
        (market?.eventQuestion ?? ("eventQuestion" in bet ? bet.eventQuestion : undefined)) ? (
          <Link
            href={`/events/${market?.eventId ?? ("eventId" in bet ? bet.eventId : "")}`}
            className="leading-5 line-clamp-2 min-h-[3rem] block text-l font-semibold ntext-stone-400 hover:text-stone-200 hover:underline border-b border-stone-800 pb-2"
            title={market?.eventQuestion ?? ("eventQuestion" in bet ? bet.eventQuestion : "")}
          >
            {market?.eventQuestion ?? ("eventQuestion" in bet ? bet.eventQuestion : "")}
          </Link>
        ) : (
          <p className="block text-sm font-medium text-stone-400">
            {market?.question ?? ("question" in bet ? bet.question : "-")}
          </p>
        )}
      </div>

      <div className="text-center min-h-[4rem]">
        <p className="text-stone-500">Válasz</p>
        <p className="font-semibold text-stone-100">{bet.outcomeLabel}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm text-center items-center">
        <div>
          <p className="text-stone-500">Pozíció</p>
          <p
            className="rounded-lg bg-slate-800 px-4 py-1 text-stone-100
           border border-slate-700 mx-8"
          >
            {toHun(bet.position)}
          </p>
        </div>
        <div>
          <p className="text-stone-500">Tét</p>
          <p>{bet.amount.toFixed(2)}ଳ</p>
        </div>
        <div>
          <p className="text-stone-500">Ár</p>
          <p>{bet.price.toFixed(4)}ଳ</p>
        </div>
        <div>
          <p className="text-stone-500">Shares</p>
          <p>{shares.toFixed(2)}</p>
        </div>
      </div>

      {isFilled && !isResolved && (
        <p className="text-s text-stone-400 text-center">
          Eladva {soldMetrics.shares.toFixed(2)} · Átlagár:{" "}
          {soldMetrics.executionPrice.toFixed(4)}ଳ · Bevétel:{" "}
          {soldMetrics.netAmount.toFixed(2)}ଳ · Profit:{" "}
          <span
            className={
              selledShareProfit > 0
                ? "text-emerald-400"
                : selledShareProfit < 0
                  ? "text-rose-400"
                  : "text-stone-400"
            }
          >
            {` ${selledShareProfitLabel}`}
          </span>
        </p>
      )}

      {isResolved && (
        <p className="text-s text-stone-400 text-center">
          Lezárva. {isWinning ? "NYERTES!" : "VESZTES."} · Bevétel:{" "}
          {payout.toFixed(2)}ଳ · Profit:{" "}
          <span
            className={
              resolvedEventProfit > 0
                ? "text-emerald-400"
                : resolvedEventProfit < 0
                  ? "text-rose-400"
                  : "text-stone-400"
            }
          >
            {` ${resolvedEventProfitLabel}ଳ`}
          </span>
        </p>
      )}

      {isCancelled && (
        <p className="text-xs text-stone-400">
          Törölve. Tét {payout}ଳ visszautalva.
        </p>
      )}

      <div className="flex items-center justify-between border-t border-stone-800 pt-2 px-4">
        {isCancelled ? (
          <span
            className="text-stone-300"
            title="Esemény törölve"
            aria-label="Esemény törölve"
          >
            ❌
          </span>
        ) : (
          <span
            className="text-stone-300"
            title={`Fogadás lezárásáig hátralévő idő: ${closeTime.longLabel}`}
            aria-label={`Fogadás lezárásáig hátralévő idő: ${closeTime.longLabel}`}
          >
            {closeTime.shortLabel}
          </span>
        )}

        {isActive && (
          <button
            className="button-gold px-4 py-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onSell}
            disabled={!canSell || sellDialogLoading}
            title={!canSell ? "Market closed" : undefined}
          >
            {sellDialogLoading ? "Számolás..." : "Sell"}
          </button>
        )}
      </div>
    </div>
  );
}
