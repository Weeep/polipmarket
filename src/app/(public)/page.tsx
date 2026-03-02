"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OpenBetsGrid } from "@/components/OpenBetsGrid";
import { ActiveEventsTabsTable } from "@/components/ActiveEventsTabsTable";
import { MyBetDTO } from "@/modules/event/dto/myBetDTO";
import { apiFetch } from "@/lib/apiFetch";

const BETS_LIMIT = 6;

export default function HomePage() {
  const [myBets, setMyBets] = useState<MyBetDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/bets/my?limit=${BETS_LIMIT}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setMyBets)
      .finally(() => setLoading(false));
  }, []);

  function updateBet(lotId: string, updatedBet: MyBetDTO | null) {
    setMyBets((prev) =>
      updatedBet === null
        ? prev.filter((bet) => bet.lotId !== lotId)
        : prev.map((bet) => (bet.lotId === lotId ? updatedBet : bet)),
    );
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-10 text-stone-300">
        Loading…
      </div>
    );
  }

  return (
    <main className="p-0 sm:p-8">
      <div className="max-w-6xl mx-auto py-0 sm:px-6 sm:py-10 space-y-6 sm:space-y-10 pt-2">
        <ActiveEventsTabsTable />

        <div className="marketcard-base space-y-4 scroll-mt-24">
          <h2 className="text-lg font-bold text-stone-100">
            Fogadásaim (utolsó {BETS_LIMIT})
          </h2>

          <OpenBetsGrid
            bets={myBets}
            onUpdateBet={updateBet}
            emptyMessage="Nincs fogadásod"
          />

          <div>
            <Link href="/myorders" className="text-amber-300 hover:underline">
              Összes fogadás
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
