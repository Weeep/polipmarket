"use client";

import { apiFetch } from "@/lib/apiFetch";
import { useMe } from "@/context/MeContext";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type UnreadAchievement = {
  id: string;
  achievementId: string;
  unlockedAt: string;
  rewardGranted: number;
  achievement: {
    id: string;
    number: number;
    code: string;
    title: string;
    description: string | null;
    reward: number;
    category: string;
    targetValue: number | null;
  };
};

export function AchievementPopupQueue() {
  const { status } = useSession();
  const { refreshMe } = useMe();
  const [queue, setQueue] = useState<UnreadAchievement[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") {
      setQueue([]);
      return;
    }

    let active = true;

    async function loadUnread() {
      const response = await apiFetch("/api/achievements/unread");
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as UnreadAchievement[];
      if (active) {
        setQueue(payload);
      }
    }

    function handleRefresh() {
      void loadUnread();
    }

    void loadUnread();
    const timer = setInterval(() => {
      void loadUnread();
    }, 30000);
    window.addEventListener("achievements:refresh-unread", handleRefresh);

    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("achievements:refresh-unread", handleRefresh);
    };
  }, [status]);

  const current = queue[0];
  if (!current) {
    return null;
  }

  async function acknowledgeCurrent() {
    if (busy) {
      return;
    }

    setBusy(true);
    try {
      await apiFetch(`/api/achievements/${current.achievementId}/ack`, {
        method: "POST",
      });
      await refreshMe();
      setQueue((prev) => prev.slice(1));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-x-0 top-3 z-40 px-3 sm:px-6">
      <div className="mx-auto max-w-xl rounded-xl border border-amber-400/40 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur">
        <p className="text-xs uppercase tracking-wide text-amber-300">Achievement feloldva</p>
        <h3 className="mt-1 text-lg font-bold text-stone-100">🏆 {current.achievement.title}</h3>
        {current.achievement.description && (
          <p className="mt-1 text-sm text-stone-300">{current.achievement.description}</p>
        )}
        <div className="mt-3 flex items-center justify-between gap-4">
          <span className="text-sm text-amber-200">Jutalom: +{current.rewardGranted}ଳ</span>
          <button
            type="button"
            disabled={busy}
            onClick={acknowledgeCurrent}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-60"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
