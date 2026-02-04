"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export function ImpersonateButton({ userId }: { userId: string }) {
  const { update } = useSession();
  const router = useRouter();

  async function impersonate() {
    const res = await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    const data = await res.json();
    await update(data);

    router.push("/");
    router.refresh();
  }

  return <button onClick={impersonate}>Impersonate</button>;
}
