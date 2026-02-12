import { MyMarketBetDTO } from "@/modules/market/dto/myMarketBetDTO";
import Link from "next/link";
import { useMe } from "@/context/MeContext";
import { apiFetch } from "@/lib/apiFetch";

type Props = {
  markets: MyMarketBetDTO[];
  onUpdateMarket: (marketId: string, updatedMarket: MyMarketBetDTO | null) => void;
};

type MarketBet = {
  market: MyMarketBetDTO;
  bet: MyMarketBetDTO["bets"][number];
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function EventMarketGroup({ markets, onUpdateMarket }: Props) {
  const { refreshMe } = useMe();

  const eventId = markets[0]?.eventId;
  const eventQuestion = markets[0]?.eventQuestion;

  const allBets: MarketBet[] = markets.flatMap((market) =>
    market.bets.map((bet) => ({ market, bet })),
  );

  async function onCancel(market: MyMarketBetDTO, orderId: string) {
    const ok = window.confirm("Are you sure you want to cancel this order?");

    if (!ok) return;

    try {
      const res = await apiFetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Cancel failed");
      }

      const remainingBets = market.bets.filter((b) => b.orderId !== orderId);

      if (remainingBets.length === 0) {
        onUpdateMarket(market.marketId, null);
      } else {
        onUpdateMarket(market.marketId, {
          ...market,
          bets: remainingBets,
        });
      }

      await refreshMe();
    } catch (err: unknown) {
      alert(getErrorMessage(err, "Cancel failed"));
    }
  }

  return (
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
          const shares = bet.amount / bet.price;
          const isCancelled = bet.status === "CANCELLED";
          const isResolved = bet.status === "FILLED" || market.status === "RESOLVED";
          const isActive = !isCancelled && !isResolved;
          const resolvedPosition = market.resolvedPosition ?? null;
          const statusLabel = isCancelled ? "Törölt" : isResolved ? "Lezárt" : "Aktív";
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

          return (
            <div
              key={bet.orderId}
              className="grid grid-cols-[1.6fr_0.8fr_0.7fr_0.7fr_0.8fr_1fr] items-center gap-2 rounded-md border border-stone-800 bg-stone-950/60 px-3 py-2 text-sm text-stone-300"
            >
              <span className="font-semibold text-stone-100">{bet.outcomeLabel}</span>
              <span className="text-stone-200">{bet.position}</span>
              <span>{bet.amount.toFixed(2)}</span>
              <span>@ {bet.price.toFixed(2)}</span>
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
                    className="button-gold px-3 py-1 text-xs"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onCancel(market, bet.orderId);
                    }}
                  >
                    Sell
                  </button>
                )}
                {isCancelled && (
                  <span className="text-xs text-stone-400">
                    Eladott {bet.amount.toFixed(2)} @ {bet.price.toFixed(2)} · {payoutLabel}
                  </span>
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
      </div>

      <div className="marketcard-statusbar text-stone-400">
        <span>{markets[0]?.status}</span>
        <span>
          Fogadás zár {new Date(markets[0]?.closesAt).toLocaleDateString()}
        </span>
        {markets[0]?.resolvesAt && (
          <span>Esemény vége {new Date(markets[0].resolvesAt).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
}
