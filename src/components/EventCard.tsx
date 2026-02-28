"use client";

import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
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

function formatSlippageExecutionLine(
  executionPrice: number,
  preTradePrice: number,
  slippageBps: number,
) {
  const slippageFraction = slippageBps / 10_000;
  const slippagePriceDelta = preTradePrice * slippageFraction;
  const slippagePercent = slippageBps / 100;

  return `${executionPrice.toFixed(4)} - árfolyamcsúszás +${slippagePriceDelta.toFixed(4)} (${slippagePercent.toFixed(0)}%)`;
}

export function EventCard({ event }: Props) {
  const presetAmounts = [10, 50, 100, 200];
  const [eventData, setEventData] = useState(event);
  const [amount, setAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [isAmountHelpOpen, setIsAmountHelpOpen] = useState(false);
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
    selectedAmount: number,
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
          amount: selectedAmount,
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

  function handleBuyClick(
    marketId: string,
    outcomeId: string,
    position: "YES" | "NO",
  ) {
    if (amount == null || !Number.isFinite(amount) || amount <= 0) {
      setAmountError("← Add meg milyen összegben szeretnél vásárolni.");
      return;
    }

    setAmountError(null);
    openBuyDialog(marketId, outcomeId, position, amount);
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
          maxSlippageBps: null,
        }),
      });

      window.dispatchEvent(new Event("achievements:refresh-unread"));

      await Promise.all([refreshMe(), refreshEventCard()]);
      setSuccess(
        `${buyDialog.quote.amount.toFixed(2)}ଳ összegért, ${buyDialog.quote.executionPrice.toFixed(4)}ଳ átlagáron, ${buyDialog.quote.estimatedShares.toFixed(2)} darab részvényt vettél (${toHun(buyDialog.position)}), Illeték: ${buyDialog.quote.fee.toFixed(2)}ଳ`,
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

  function toHun(position: string): string {
    if (position === "YES") {
      return "IGEN";
    } else if (position === "NO") {
      return "NEM";
    } else {
      return position;
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

        <div className="marketcard-amount justify-center text-center sm:justify-start sm:text-left">
          <span className="marketcard-amount-label">Összeg (ଳ)</span>
          <div className="marketcard-amount-bar justify-center rounded-3xl sm:justify-start sm:rounded-full">
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
                  setAmountError(null);
                }}
              >
                {value}
              </button>
            ))}
            <input
              type="number"
              min="1"
              value={customAmount}
              placeholder="Egyedi"
              onFocus={() => setIsCustomAmount(true)}
              onChange={(e) => {
                const nextValue = e.target.value;
                setCustomAmount(nextValue);
                setIsCustomAmount(true);
                const parsedAmount = Number(nextValue);
                if (
                  !nextValue ||
                  !Number.isFinite(parsedAmount) ||
                  parsedAmount <= 0
                ) {
                  setAmount(null);
                } else {
                  setAmount(parsedAmount);
                  setAmountError(null);
                }
              }}
              data-active={isCustomAmount}
              className="marketcard-amount-input"
            />
          </div>
          {amountError && (
            <div className="text-center sm:text-left">
              <p className="text-sm text-yellow-600">
                {amountError}{" "}
                <button
                  type="button"
                  onClick={() => setIsAmountHelpOpen(true)}
                  className="mt-1 text-sm font-semibold text-yellow-500 underline hover:text-red-600"
                >
                  Tessék?!
                </button>
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {eventData.markets.map((market) => {
            const outcome = market.outcomes?.[0];
            const marketStats = market.marketStats?.totalMarketStats;
            return (
              <div
                key={market.id}
                className="marketcard-outcome flex flex-wrap items-center justify-center gap-4 sm:justify-between"
              >
                <div className="space-y-1 text-center sm:text-left">
                  <div className="marketcard-outcome-label">
                    {market.question}
                  </div>
                  <div className="text-xs uppercase text-stone-400">
                    {market.status}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-start">
                  <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
                    <button
                      className="marketcard-no-button disabled:opacity-50"
                      disabled={
                        submitting ||
                        buyDialogLoading ||
                        market.status !== "OPEN" ||
                        outcome?.yesPrice == null ||
                        !outcome
                      }
                      onClick={() =>
                        outcome && handleBuyClick(market.id, outcome.id, "YES")
                      }
                    >
                      <span>IGEN&nbsp;</span>
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
                        market.status !== "OPEN" ||
                        outcome?.noPrice == null ||
                        !outcome
                      }
                      onClick={() =>
                        outcome && handleBuyClick(market.id, outcome.id, "NO")
                      }
                    >
                      <span>NEM&nbsp;</span>
                      <span className="marketcard-price">
                        {outcome?.noPrice != null
                          ? `(${outcome.noPrice.toFixed(2)})`
                          : "(—)"}
                      </span>
                    </button>
                  </div>

                  {marketStats && (
                    <div className="hidden text-xs text-stone-300">
                      Bets: {marketStats.totalBets} · Volume:{"  "}
                      {formatVolume(marketStats.totalVolume)}ଳ
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {eventData.eventStats && (
          <div className="marketcard-statusbar justify-center">
            Összes vásárlás: {eventData.eventStats.totalBets} · Összeg :{"  "}
            {formatVolume(eventData.eventStats.totalVolume)}ଳ
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
            <h3 className="mb-3 text-lg font-bold text-stone-100">
              Vásárlás megerősítése
            </h3>
            <div className="space-y-1 text-sm">
              <p>
                Összeg:{" "}
                <span className="font-semibold">
                  {buyDialog.quote.amount.toFixed(2)}ଳ
                </span>
              </p>
              <p>
                Várható átlagár:{" "}
                <span className="font-semibold">
                  {formatSlippageExecutionLine(
                    buyDialog.quote.executionPrice,
                    buyDialog.quote.preTradePrice,
                    buyDialog.quote.slippageBps,
                  )}
                </span>
              </p>
              <p>
                Várható részvény:{" "}
                <span className="font-semibold">
                  {buyDialog.quote.estimatedShares.toFixed(2)} db
                </span>
              </p>
              <p>
                Pozíció:{" "}
                <span className="font-semibold">
                  {toHun(buyDialog.position)}
                </span>
              </p>
              <p>
                Illeték:{" "}
                <span className="font-semibold">
                  {buyDialog.quote.fee.toFixed(2)}ଳ
                </span>
              </p>
              <p>
                Nyereség (ha nyer):{" "}
                <span className="font-semibold text-emerald-400">
                  {buyDialog.quote.estimatedShares.toFixed(2)}ଳ
                </span>{" "}
                <span>(Profit: </span>
                <span className="font-semibold text-emerald-400">
                  {winProfit.toFixed(2)}ଳ
                </span>
                <span>)</span>
              </p>
              <p>
                Veszteség (ha veszít):{" "}
                <span className="font-semibold text-rose-400">
                  {buyDialog.quote.amount.toFixed(2)}ଳ
                </span>
              </p>
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

      {isAmountHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-6">
          <div className="max-h-[calc(100vh-3rem)] w-full max-w-lg overflow-y-auto rounded-xl border border-yellow-500/50 bg-stone-900 p-5 text-stone-200 shadow-2xl">
            <h3 className="mb-3 text-lg font-bold text-yellow-500">
              Miért kell összeget választani?
            </h3>
            <div className="space-y-3 text-sm leading-relaxed text-stone-300">
              <p>
                Ez nem egy sima szavazás, hanem egy előrejelzési piac
                (prediction market).
              </p>
              <p>
                Itt nem csak azt mondod meg, szerinted ki nyer — hanem pénzt is
                teszel rá, vásárolsz.
              </p>
              <p className="py-2 font-bold">Hogyan működik?</p>
              <p>Például, ha azt látod:</p>
              <button className="ml-8 marketcard-no-button disabled:opacity-50">
                IGEN (0.55)
              </button>
              <p>
                az azt jelenti: a piac jelenleg kb. 55% esélyt ad annak, hogy az
                esemény bekövetkezik (pl: adott jelölt nyer), ezért az ára
                0.55ଳ. Ha te úgy gondolod, hogy ez alul- vagy túl van árazva,
                akkor tudsz vásárolni belőle.
              </p>
              <p>De ehhez el kell döntened:</p>
              <p className="ml-8">💰 Mennyi pénzzel szeretnél beszállni.</p>
              <p className="py-2 font-bold">Miért fontos az összeg?</p>
              <p>Az összeg határozza meg:</p>
              <ul className="ml-8">
                <li>📈 Mennyit nyerhetsz, ha igazad lesz</li>
                <li>📉 Mennyit veszíthetsz, ha nem</li>
              </ul>{" "}
              <p>Ez olyan, mint részvényt venni:</p>
              <ul className="ml-8">
                <li>
                  Ha kevés pénzt teszel be → kisebb kockázat, kisebb nyereség
                </li>
                <li>
                  Ha többet → nagyobb kockázat, nagyobb potenciális nyereség
                </li>
              </ul>
              <p className="py-2 font-bold">Konkrét példa</p>
              <p>Ha az</p>
              <ul className="ml-8">
                <li>- IGEN ára 0.55ଳ</li>
                <li>- Te 55ଳ-ért veszel 100at belőle</li>
              </ul>
              <p>
                és tényleg az történik, amire fogadtál (pl: a jelölt valóban
                nyer) → minden részvényed 1.00-et fog érni, így 100ଳ-ot kapsz
                vissza az esemény végén, a nyereséged: 45ଳ.
              </p>
              <p>
                Ha nem az történik (pl: a jelölt nem nyer) → 0-t ér, így a
                befektetett 55ଳ-ot elvesztetted.
              </p>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAmountHelpOpen(false)}
                className="button-gold"
              >
                Értem
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
