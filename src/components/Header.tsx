"use client";

import Link from "next/link";
import { useMe } from "@/context/MeContext";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import {
  EVENT_CATEGORY_OPTIONS,
  parseCategoryParam,
} from "@/modules/event/domain/eventCategoryMeta";
import type { EventCategory } from "@/modules/event/domain/Event";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuery =
    pathname === "/events" ? (searchParams.get("q") ?? "") : "";
  const currentCategory =
    pathname === "/events"
      ? parseCategoryParam(searchParams.get("category"))
      : null;
  const { data: session, update } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [searchValue, setSearchValue] = useState(currentQuery);
  const [isCategoryPanelOpen, setIsCategoryPanelOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { me } = useMe();
  const previousAmountsRef = useRef<{ balance: number; locked: number } | null>(
    null,
  );
  const balanceAmountRef = useRef<HTMLDivElement>(null);
  const lockedAmountRef = useRef<HTMLDivElement>(null);

  const isImpersonating = Boolean(session?.user?.impersonatedBy);
  const isAdmin = me?.role === "ADMIN";

  useEffect(() => {
    if (!me) {
      return;
    }

    const previous = previousAmountsRef.current;

    function triggerWalletAnimation(target: HTMLDivElement | null) {
      if (!target) {
        return;
      }
      target.classList.remove("wallet-amount--changed");
      void target.offsetWidth;
      target.classList.add("wallet-amount--changed");
    }

    if (previous) {
      if (previous.balance !== me.balance) {
        triggerWalletAnimation(balanceAmountRef.current);
      }
      if (previous.locked !== me.locked) {
        triggerWalletAnimation(lockedAmountRef.current);
      }
    }

    previousAmountsRef.current = { balance: me.balance, locked: me.locked };
  }, [me]);

  useEffect(() => {
    setSearchValue(currentQuery);
  }, [currentQuery]);

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

  async function handleDeleteAccount() {
    try {
      setIsDeleteSubmitting(true);
      setDeleteError(null);
      await apiFetch("/api/me/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: deleteReason }),
      });
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "A törlés sikertelen.",
      );
    } finally {
      setIsDeleteSubmitting(false);
    }
  }

  function buildEventsUrl(nextQuery: string, category: EventCategory | null) {
    const params = new URLSearchParams();

    if (nextQuery.length >= 2) {
      params.set("q", nextQuery);
    }

    if (category) {
      params.set("category", category);
    }

    return params.toString() ? `/events?${params.toString()}` : "/events";
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = searchValue.trim();
    router.push(buildEventsUrl(normalized, currentCategory));
    setIsCategoryPanelOpen(false);
  }

  function handleCategorySelect(category: EventCategory | null) {
    const normalized = searchValue.trim();
    router.push(buildEventsUrl(normalized, category));
    setIsCategoryPanelOpen(false);
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
            <div ref={balanceAmountRef} className="wallet-amount">
              💰 {me.balance.toLocaleString()}ଳ
            </div>
            <div ref={lockedAmountRef} className="wallet-amount">
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
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-stone-100">
                    {me.name}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteDialogOpen(true);
                      setDeleteError(null);
                      setIsMenuOpen(false);
                      setDeleteReason("");
                    }}
                    className="text-xs text-zinc-400 hover:text-zinc-300"
                  >
                    Törlés
                  </button>
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

      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl border border-stone-700 bg-stone-900 p-5 text-stone-200 shadow-2xl">
            <h3 className="mb-3 text-lg font-bold text-stone-100">
              Fiók törlése
            </h3>
            <div className="space-y-2 text-sm text-stone-300">
              <p>
                A törlés után a profilod anonimizáljuk, a neved és a képed
                eltűnik, valamint az egyenleged és zárolt összegeid nullázódnak.
              </p>
              <p>
                A művelet végleges. A törlés után ezzel a Google/email fiókkal
                már nem fogsz tudni újra regisztrálni. Biztosan szeretnéd
                törölni a fiókodat?
              </p>
            </div>

            <label className="mt-3 block text-xs text-stone-400">
              Opcionális indoklás:
              <textarea
                value={deleteReason}
                onChange={(event) => setDeleteReason(event.target.value)}
                maxLength={500}
                rows={3}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-amber-400 focus:outline-none"
                placeholder="Miért törlöd a fiókot?"
              />
            </label>

            {deleteError && (
              <p className="mt-3 text-xs text-rose-400">{deleteError}</p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeleteSubmitting}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-stone-300 hover:bg-zinc-800 disabled:opacity-60"
              >
                Mégse
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleteSubmitting}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-60"
              >
                {isDeleteSubmitting ? "Törlés folyamatban..." : "Igen, törlöm"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pt-3 border-t border-stone-700">
        <form
          onSubmit={handleSearchSubmit}
          className="mx-auto w-full max-w-3xl"
        >
          <label className="block w-full">
            <span className="sr-only">Search</span>
            <input
              type="search"
              name="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              onFocus={() => setIsCategoryPanelOpen(true)}
              placeholder="Keresés események között..."
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-stone-100 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none"
            />
          </label>

          {isCategoryPanelOpen && (
            <div className="flex flex-wrap gap-4 justify-center pt-2">
              <button
                type="button"
                onClick={() => handleCategorySelect(null)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  currentCategory === null
                    ? "border-amber-300 bg-amber-400/20 text-amber-100"
                    : "border-zinc-600 text-stone-300"
                }`}
              >
                Összes
              </button>

              {EVENT_CATEGORY_OPTIONS.map((category) => (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => handleCategorySelect(category.value)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    currentCategory === category.value
                      ? "border-amber-300 bg-amber-400/20 text-amber-100"
                      : "border-zinc-600 text-stone-300"
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          )}
        </form>
      </div>
    </header>
  );
}
