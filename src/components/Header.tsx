"use client";

import Link from "next/link";
import { useMe } from "@/context/MeContext";
import { useSession } from "next-auth/react";
import Image from "next/image";

export function Header() {
  const { data: session, update } = useSession();

  const { me } = useMe();
  if (!me) return null;

  const isImpersonating = Boolean(session?.user?.impersonatedBy);
  const isAdmin = me?.role === "ADMIN"; //session?.user?.role === "ADMIN";

  async function stopImpersonation() {
    await update({ impersonatedUserId: null });
    window.location.href = "/";
  }

  return (
    <header className="bg-zinc-800 text-white px-6 py-4 flex items-center">
      <div className="flex direction-row items-center">
        <Link href="/">
          <div className="font-semibold text-lg tracking-tight">
            Polipmarket
          </div>
        </Link>
        <Link href="/events">
          <button className="button-gold ml-8">Events</button>
        </Link>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <div className="text-stone-200 text-sm">
          <div>💰 {me.balance.toLocaleString()}ଳ</div>
          <div>🔒 {me.locked.toLocaleString()}ଳ</div>
        </div>
        {isImpersonating ? (
          <button onClick={stopImpersonation}>Stop impersonation</button>
        ) : (
          isAdmin && <a href="/king">Admin</a>
        )}
        <span>{me?.name}</span>

        {me.image ? (
          <div className="relative w-8 h-8">
            <Image
              src={me.image}
              alt="profile image"
              fill
              className="rounded-full border-2 border-stone-200 object-cover"
            />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-sm">
            {me.name?.[0] ?? "U"}
          </div>
        )}
      </div>
    </header>
  );
}
