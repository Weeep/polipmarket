"use client";

import Link from "next/link";
import { useMe } from "@/context/MeContext";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuery = pathname === "/events" ? (searchParams.get("q") ?? "") : "";
  const { data: session, update } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { me } = useMe();
  const [animateBalance, setAnimateBalance] = useState(false);
  const [animateLocked, setAnimateLocked] = useState(false);
  const previousAmountsRef = useRef<{ balance: number; locked: number } | null>(null);

  const isImpersonating = Boolean(session?.user?.impersonatedBy);
  const isAdmin = me?.role === "ADMIN";

  useEffect(() => {
    if (!me) {
      return;
    }

    const previous = previousAmountsRef.current;
    if (previous) {
      if (previous.balance !== me.balance) {
        window.setTimeout(() => setAnimateBalance(true), 0);
      }
      if (previous.locked !== me.locked) {
        window.setTimeout(() => setAnimateLocked(true), 0);
      }
    }

    previousAmountsRef.current = { balance: me.balance, locked: me.locked };
  }, [me]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function stopImpersonation() {
    await update({ impersonatedUserId: null });
    window.location.href = "/";
  }

  async function handleLogout() {
    await signOut({ callbackUrl: "/" });
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const rawValue = formData.get("search");
    const normalized = typeof rawValue === "string" ? rawValue.trim() : "";

    if (normalized.length < 2) {
      router.push("/events");
      return;
    }

    const params = new URLSearchParams();
    params.set("q", normalized);
    router.push(`/events?${params.toString()}`);
  }

  if (!me) return null;

  return (
    <header className="bg-zinc-800 px-4 py-4 text-white sm:px-6">
      <div className="flex items-center gap-3 sm:gap-4 mb-1">
        <Link
          href="/"
          aria-label="Polipmarket home"
          className="shrink-0 leading-none"
        >
          <div className="text-xs font-bold uppercase tracking-[0.24em] text-stone-100 sm:text-sm">
            <div className="w-[8ch] text-[1.4rem]">POLIP</div>
            <div className="-mt-2 w-[7.2ch] text-[.9rem]">MARKET</div>
          </div>
        </Link>

        <div className="hidden flex-1 justify-center px-2 md:flex">
          <MobileBottomNav mode="desktop" />
        </div>

        <div className="ml-auto flex items-center gap-3 sm:gap-4">
          <div className="text-right text-xs text-stone-200 sm:text-sm">
            <div
              className={animateBalance ? "wallet-amount wallet-amount--changed" : "wallet-amount"}
              onAnimationEnd={() => setAnimateBalance(false)}
            >
              💰 {me.balance.toLocaleString()}ଳ
            </div>
            <div
              className={animateLocked ? "wallet-amount wallet-amount--changed" : "wallet-amount"}
              onAnimationEnd={() => setAnimateLocked(false)}
            >
              🔒 {me.locked.toLocaleString()}ଳ
            </div>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              aria-expanded={isMenuOpen}
              aria-label="Open profile menu"
            >
              {me.image ? (
                <div className="relative h-8 w-8">
                  <Image
                    src={me.image}
                    alt="profile image"
                    fill
                    className="rounded-full border-2 border-stone-200 object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-200 text-sm text-zinc-800">
                  {me.name?.[0] ?? "U"}
                </div>
              )}
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-11 z-20 w-52 rounded-xl border border-zinc-700 bg-zinc-900 p-3 shadow-xl">
                <div className="text-sm font-medium text-stone-100">
                  {me.name}
                </div>
                <hr className="my-3 border-zinc-700" />
                <div className="space-y-1 text-sm">
                  {isImpersonating ? (
                    <button
                      type="button"
                      onClick={stopImpersonation}
                      className="w-full rounded-lg px-2 py-1.5 text-left text-stone-200 hover:bg-zinc-800"
                    >
                      Stop impersonation
                    </button>
                  ) : (
                    isAdmin && (
                      <Link
                        href="/king"
                        onClick={() => setIsMenuOpen(false)}
                        className="block rounded-lg px-2 py-1.5 text-stone-200 hover:bg-zinc-800"
                      >
                        Admin
                      </Link>
                    )
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full rounded-lg px-2 py-1.5 text-left text-stone-200 hover:bg-zinc-800"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-stone-700">
        <form onSubmit={handleSearchSubmit} className="mx-auto w-full max-w-3xl">
          <label className="block w-full">
            <span className="sr-only">Search</span>
            <input
              key={`${pathname}-${currentQuery}`}
              type="search"
              name="search"
              defaultValue={currentQuery}
              placeholder="Keresés események és marketek között..."
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-stone-100 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none"
            />
          </label>
        </form>
      </div>
    </header>
  );
}
