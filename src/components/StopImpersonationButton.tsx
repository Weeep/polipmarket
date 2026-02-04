"use client";

import { useSession } from "next-auth/react";

export function StopImpersonationButton() {
  const { update } = useSession();

  async function stop() {
    await update({ impersonatedUserId: null });
  }

  return <button onClick={stop}>Stop impersonation</button>;
}
