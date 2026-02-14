import { MyEventMarketBetDTO } from "@/modules/event/dto/myEventMarketBetDTO";
import Link from "next/link";
import { useMe } from "@/context/MeContext";
import { apiFetch } from "@/lib/apiFetch";

type Props = {
  markets: MyEventMarketBetDTO[];
  onUpdateMarket: (marketId: string, updatedMarket: MyEventMarketBetDTO | null) => void;
};

type MarketBet = {
  market: MyEventMarketBetDTO;
  bet: MyEventMarketBetDTO["bets"][number];
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

  async function onSell(market: MyEventMarketBetDTO, bet: MarketBet["bet"]) {
    const shares = bet.amount / bet.price;
    const ok = window.confirm(
      `Sell ${shares.toFixed(2)} shares of ${bet.position} at market price?`,
    );

    if (!ok) return;

    try {
      const res = await apiFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          marketId: market.marketId,
          outcomeId: bet.outcomeId,
          position: bet.position,
          side: "SELL",
          shares,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Sell failed");
      }

      onUpdateMarket(market.marketId, {
        ...market,
        bets: market.bets.map((currentBet) =>
          currentBet.orderId === bet.orderId
            ? {
                ...currentBet,
                status: "FILLED",
                soldAmount:
                  typeof body.amount === "number"
                    ? body.amount
                    : currentBet.soldAmount,
                soldPrice:
                  typeof body.amount === "number" && shares > 0
                    ? body.amount / shares
                    : currentBet.soldPrice,
                soldAt:
                  typeof body.createdAt === "string"
                    ? body.createdAt
                    : new Date().toISOString(),
              }
            : currentBet,
        ),
      });

      await refreshMe();
    } catch (err: unknown) {
      alert(getErrorMessage(err, "Sell failed"));
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
          const soldPrice = bet.soldPrice ?? bet.price;
          const soldAmount = bet.soldAmount ?? bet.amount;
          const soldShares = soldPrice > 0 ? soldAmount / soldPrice : shares;

          return (
            <div
              key={bet.orderId}
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
                      if (!canSell) return;
                      onSell(market, bet);
                    }}
                    disabled={!canSell}
                    title={!canSell ? "Market closed" : undefined}
                  >
                    Sell
                  </button>
                )}
                {(isCancelled || isFilled) && (
                  <span className="text-xs text-stone-400">
                    Eladott {soldShares.toFixed(2)} @ {soldPrice.toFixed(2)} · Bevétel: {soldAmount.toFixed(2)}
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
        <span>Fogadás zár {new Date(markets[0]?.closesAt).toLocaleDateString()}</span>
        {markets[0]?.resolvesAt && (
          <span>Esemény vége {new Date(markets[0].resolvesAt).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
}
