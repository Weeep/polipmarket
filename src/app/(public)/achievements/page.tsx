"use client";

import { apiFetch } from "@/lib/apiFetch";
import { useEffect, useState } from "react";

type AchievementRow = {
  id: string;
  number: number;
  code: string;
  title: string;
  description: string | null;
  reward: number;
  category: string;
  targetValue: number | null;
  isActive: boolean;
  unlockedAt: string | null;
  rewardGranted: number | null;
  acknowledgedAt: string | null;
};

export default function AchievementsPage() {
  const [items, setItems] = useState<AchievementRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/achievements")
      .then((res) => (res.ok ? res.json() : []))
      .then((payload) => setItems(payload as AchievementRow[]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <main className="max-w-4xl mx-auto px-4 py-8 text-stone-300">Loading…</main>;
  }

  const unlockedCount = items.filter((item) => item.unlockedAt).length;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="marketcard-base">
        <h1 className="text-2xl font-bold text-stone-100">Sikerek</h1>
        <p className="mt-2 text-stone-300 text-sm">
          Megszerzett achievementek: <strong>{unlockedCount}</strong> / {items.length}
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const unlocked = Boolean(item.unlockedAt);

          return (
            <section
              key={item.id}
              className={`rounded-xl border p-4 ${
                unlocked
                  ? "border-amber-500/40 bg-amber-500/10"
                  : "border-zinc-700 bg-zinc-900/70"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-stone-400">#{item.number}</p>
                  <h2 className="text-base font-semibold text-stone-100">{item.title}</h2>
                  {item.description && (
                    <p className="mt-1 text-sm text-stone-300">{item.description}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-amber-300 font-semibold">+{item.reward}ଳ</p>
                  <p className="text-xs text-stone-400">{item.category}</p>
                </div>
              </div>
              <div className="mt-3 text-xs text-stone-400">
                {unlocked
                  ? `Feloldva: ${new Date(item.unlockedAt!).toLocaleString("hu-HU")}`
                  : "Még nem oldottad fel"}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
