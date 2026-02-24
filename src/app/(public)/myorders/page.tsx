"use client";

import { useEffect, useState } from "react";
import { BetCard } from "@/components/BetCard";
import { useMe } from "@/context/MeContext";
import { MyEventMarketBetDTO } from "@/modules/event/dto/myEventMarketBetDTO";
import { apiFetch } from "@/lib/apiFetch";
import type { QuoteSellResult } from "@/modules/order/application/quoteSell";

const INITIAL_CLOSED_BETS_LIMIT = 20;
const CLOSED_BETS_PAGE_SIZE = 10;

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
  return groups.flatMap((markets) =>
    markets.flatMap((market) => market.bets.map((bet) => ({ market, bet }))),
  );
}

function filterMarketsByBetStatus(
  markets: MyEventMarketBetDTO[],
  statuses: string[],
) {
  return markets
    .map((market) => {
      const filteredBets = market.bets.filter((bet) =>
        statuses.includes(bet.status),
      );

      if (filteredBets.length === 0) {
        return null;
      }

      const latestBetAt = filteredBets
        .map((bet) => new Date(bet.createdAt).getTime())
        .reduce((a, b) => Math.max(a, b), 0);

      return {
        ...market,
        bets: filteredBets,
        latestBetAt: new Date(latestBetAt).toISOString(),
      };
    })
    .filter((market): market is MyEventMarketBetDTO => market !== null)
    .sort(
      (a, b) =>
        new Date(b.latestBetAt).getTime() - new Date(a.latestBetAt).getTime(),
    );
}

function limitMarketsByBetCount(
  markets: MyEventMarketBetDTO[],
  limit: number,
): MyEventMarketBetDTO[] {
  if (limit <= 0) {
    return [];
  }

  const limitedMarkets: MyEventMarketBetDTO[] = [];
  let remaining = limit;

  for (const market of markets) {
    if (remaining <= 0) {
      break;
    }

    const bets = market.bets.slice(0, remaining);
    if (bets.length === 0) {
      continue;
    }

    const latestBetAt = bets
      .map((bet) => new Date(bet.createdAt).getTime())
      .reduce((a, b) => Math.max(a, b), 0);

    limitedMarkets.push({
      ...market,
      bets,
      latestBetAt: new Date(latestBetAt).toISOString(),
    });

    remaining -= bets.length;
  }

  return limitedMarkets;
}

function mergeUpdatedMarket(
  currentMarket: MyEventMarketBetDTO,
  updatedMarket: MyEventMarketBetDTO,
): MyEventMarketBetDTO {
  const updatedBetsByLotId = new Map(
    updatedMarket.bets.map((bet) => [bet.lotId, bet]),
  );

  const mergedCurrentBets = currentMarket.bets.map(
    (bet) => updatedBetsByLotId.get(bet.lotId) ?? bet,
  );
  const currentLotIds = new Set(currentMarket.bets.map((bet) => bet.lotId));
  const newBets = updatedMarket.bets.filter(
    (bet) => !currentLotIds.has(bet.lotId),
  );

  return {
    ...currentMarket,
    ...updatedMarket,
    bets: [...mergedCurrentBets, ...newBets],
  };
}

export default function MyOrdersPage() {
  const { refreshMe } = useMe();
  const [myMarkets, setMyMarkets] = useState<MyEventMarketBetDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleClosedBetCount, setVisibleClosedBetCount] = useState(
    INITIAL_CLOSED_BETS_LIMIT,
  );
  const [sellDialog, setSellDialog] = useState<SellDialogState | null>(null);
  const [sellDialogLoading, setSellDialogLoading] = useState(false);
  const [sellDialogError, setSellDialogError] = useState<string | null>(null);
  const [sellSubmitting, setSellSubmitting] = useState(false);

  useEffect(() => {
    apiFetch("/api/events/my")
      .then((r) => (r.ok ? r.json() : []))
      .then(setMyMarkets)
      .finally(() => setLoading(false));
  }, []);

  function updateMarket(
    marketId: string,
    updatedMarket: MyEventMarketBetDTO | null,
  ) {
    setMyMarkets((prev) =>
      updatedMarket === null
        ? prev.filter((market) => market.marketId !== marketId)
        : prev.map((market) =>
            market.marketId === marketId
              ? mergeUpdatedMarket(market, updatedMarket)
              : market,
          ),
    );
  }

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

      updateMarket(market.marketId, {
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

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10 text-stone-300">
        Loading…
      </div>
    );
  }

  const openMarkets = filterMarketsByBetStatus(myMarkets, ["OPEN"]);
  const closedMarkets = filterMarketsByBetStatus(myMarkets, [
    "FILLED",
    "CANCELLED",
  ]);
  const totalClosedBetCount = closedMarkets.reduce(
    (sum, market) => sum + market.bets.length,
    0,
  );

  const openBets = flattenGroupedMarkets(groupMarketsByEvent(openMarkets));
  const visibleClosedMarkets = limitMarketsByBetCount(
    closedMarkets,
    visibleClosedBetCount,
  );
  const closedBets = flattenGroupedMarkets(
    groupMarketsByEvent(visibleClosedMarkets),
  );

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-bold text-stone-100">Fogadásaim</h1>

      <section className="marketcard-base space-y-4">
        <h2 className="text-lg font-semibold text-stone-200">
          Aktív fogadások
        </h2>
        {openBets.length === 0 ? (
          <p className="text-sm text-stone-400">Nincs aktív fogadásod.</p>
        ) : (
          <div className="rounded-lg bg-stone-900 p-4">
            <div className="mx-auto flex max-w-[954px] flex-wrap gap-3">
              {openBets.map(({ market, bet }) => {
                const isActive = bet.status === "OPEN";
                const canSell =
                  isActive &&
                  market.status === "OPEN" &&
                  new Date(market.closesAt) > new Date();

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
                <p className="w-full text-right text-xs text-rose-400">
                  {sellDialogError}
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="marketcard-base space-y-4">
        <h2 className="text-lg font-semibold text-stone-200">
          Lezárt fogadások
        </h2>
        {closedBets.length === 0 ? (
          <p className="text-sm text-stone-400">Nincs lezárt fogadásod.</p>
        ) : (
          <>
            <div className="rounded-lg bg-stone-900 p-4">
              <div className="mx-auto flex max-w-[954px] flex-wrap gap-3">
                {closedBets.map(({ market, bet }) => (
                  <BetCard
                    key={bet.lotId}
                    market={market}
                    bet={bet}
                    canSell={false}
                    sellDialogLoading={sellDialogLoading}
                    onSell={() => undefined}
                  />
                ))}
              </div>
            </div>

            {visibleClosedBetCount < totalClosedBetCount && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setVisibleClosedBetCount(
                      (prev) => prev + CLOSED_BETS_PAGE_SIZE,
                    )
                  }
                  className="button-gold px-5 py-2 text-sm"
                >
                  Tovább
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {sellDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl border border-stone-700 bg-stone-900 p-5 text-stone-200 shadow-2xl">
            <h3 className="mb-3 text-lg font-bold text-stone-100">
              Eladás megerősítése
            </h3>
            <div className="space-y-1 text-sm">
              <p>
                Részvények: {" "}
                <span className="font-semibold">
                  {sellDialog.quote.shares.toFixed(2)}
                </span>
              </p>
              <p>
                Várható átlagár: {" "}
                <span className="font-semibold">
                  {sellDialog.quote.executionPrice.toFixed(4)}
                </span>
              </p>
              <p>
                Várható bruttó bevétel: {" "}
                <span className="font-semibold">
                  {sellDialog.quote.grossAmount.toFixed(2)}
                </span>
              </p>
              <p>
                Fee: {" "}
                <span className="font-semibold">
                  {sellDialog.quote.fee.toFixed(2)}
                </span>
              </p>
              <p>
                Kézhez kapott összeg: {" "}
                <span className="font-semibold text-emerald-400">
                  {sellDialog.quote.netAmount.toFixed(2)}
                </span>
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
    </main>
  );
}
