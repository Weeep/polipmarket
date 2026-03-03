"use client";

import { useSession } from "next-auth/react";

export function StopImpersonationButton() {
  const { update } = useSession();

  async function stop() {
    await update({ impersonatedUserId: null });
  }

  return (
    <button
      onClick={stop}
      className="cursor-pointer rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm font-medium text-stone-100 transition hover:bg-stone-700"
    >
      Stop impersonation
    </button>
  );
}
