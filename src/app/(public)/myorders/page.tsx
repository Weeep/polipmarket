"use client";

import { useEffect, useState } from "react";
import { BetCard } from "@/components/BetCard";
import { OpenBetsGrid } from "@/components/OpenBetsGrid";
import { useMe } from "@/context/MeContext";
import { MyBetDTO } from "@/modules/event/dto/myBetDTO";
import { apiFetch } from "@/lib/apiFetch";

const INITIAL_CLOSED_BETS_LIMIT = 20;
const CLOSED_BETS_PAGE_SIZE = 10;

export default function MyOrdersPage() {
  const { refreshMe } = useMe();
  const [openBets, setOpenBets] = useState<MyBetDTO[]>([]);
  const [closedBets, setClosedBets] = useState<MyBetDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleClosedBetCount, setVisibleClosedBetCount] = useState(
    INITIAL_CLOSED_BETS_LIMIT,
  );
  const [hasMoreClosed, setHasMoreClosed] = useState(true);
  const [serverClosedOffset, setServerClosedOffset] = useState(0);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/bets/my?status=open&limit=500"),
      apiFetch(`/api/bets/my?status=closed&limit=${INITIAL_CLOSED_BETS_LIMIT}`),
    ])
      .then(async ([openRes, closedRes]) => [
        openRes.ok ? await openRes.json() : [],
        closedRes.ok ? await closedRes.json() : [],
      ])
      .then(([open, closed]) => {
        setOpenBets(open);
        setClosedBets(closed);
        setHasMoreClosed(closed.length === INITIAL_CLOSED_BETS_LIMIT);
        setServerClosedOffset(closed.length);
      })
      .finally(() => setLoading(false));
  }, []);

  async function loadMoreClosedBets() {
    const res = await apiFetch(
      `/api/bets/my?status=closed&limit=${CLOSED_BETS_PAGE_SIZE}&offset=${serverClosedOffset}`,
    );

    if (!res.ok) {
      return;
    }

    const next = (await res.json()) as MyBetDTO[];
    setClosedBets((prev) => [...prev, ...next]);
    setVisibleClosedBetCount((prev) => prev + CLOSED_BETS_PAGE_SIZE);
    setHasMoreClosed(next.length === CLOSED_BETS_PAGE_SIZE);
    setServerClosedOffset((prev) => prev + next.length);
  }

  function updateOpenBet(lotId: string, updatedBet: MyBetDTO | null) {
    if (updatedBet === null) {
      setOpenBets((prev) => prev.filter((bet) => bet.lotId !== lotId));
      return;
    }

    setOpenBets((prev) => prev.filter((bet) => bet.lotId !== lotId));
    setClosedBets((prev) => [updatedBet, ...prev]);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10 text-stone-300">
        Loading…
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-bold text-stone-100">Fogadásaim</h1>

      <section className="marketcard-base space-y-4">
        <h2 className="text-lg font-semibold text-stone-200">Aktív fogadások</h2>
        <OpenBetsGrid
          bets={openBets}
          onUpdateBet={updateOpenBet}
          onSellSuccess={refreshMe}
          emptyMessage="Nincs aktív fogadásod."
        />
      </section>

      <section className="marketcard-base space-y-4">
        <h2 className="text-lg font-semibold text-stone-200">Lezárt fogadások</h2>
        {closedBets.length === 0 ? (
          <p className="text-sm text-stone-400">Nincs lezárt fogadásod.</p>
        ) : (
          <>
            <div className="rounded-lg bg-stone-900 p-4">
              <div className="mx-auto flex max-w-[954px] flex-wrap gap-3">
                {closedBets.map((bet) => (
                  <BetCard
                    key={bet.lotId}
                    bet={bet}
                    canSell={false}
                    sellDialogLoading={false}
                    onSell={() => undefined}
                  />
                ))}
              </div>
            </div>

            {hasMoreClosed && closedBets.length >= visibleClosedBetCount && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={loadMoreClosedBets}
                  className="button-gold px-5 py-2 text-sm"
                >
                  Tovább
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
