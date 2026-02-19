"use client";

import Link from "next/link";
import { useMe } from "@/context/MeContext";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function HeaderSearch() {
  return (
    <div className="hidden md:flex flex-1 justify-center px-6">
      <label className="w-full max-w-md">
        <span className="sr-only">Search</span>
        <input
          type="search"
          placeholder="Keresés események között..."
          className="w-full rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm text-stone-100 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none"
        />
      </label>
    </div>
  );
}

export function Header() {
  const { data: session, update } = useSession();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { me } = useMe();

  const isImpersonating = Boolean(session?.user?.impersonatedBy);
  const isAdmin = me?.role === "ADMIN";
  const isHomePage = pathname === "/";

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

  if (!me) return null;

  return (
    <header className="bg-zinc-800 text-white px-4 sm:px-6 py-4 flex items-center gap-3 sm:gap-4">
      <Link
        href="/"
        aria-label="Polipmarket home"
        className="shrink-0 leading-none"
      >
        <div className="uppercase font-bold tracking-[0.24em] text-xs sm:text-sm text-stone-100">
          <div className="w-[8ch] text-[1.4rem]">POLIP</div>
          <div className="w-[7.2ch]  text-[.9rem] -mt-2">MARKET</div>
        </div>
      </Link>

      {isHomePage && <HeaderSearch />}

      <div className="ml-auto flex items-center gap-3 sm:gap-4">
        <div className="text-stone-200 text-xs sm:text-sm text-right">
          <div>💰 {me.balance.toLocaleString()}ଳ</div>
          <div>🔒 {me.locked.toLocaleString()}ଳ</div>
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
              <div className="relative w-8 h-8">
                <Image
                  src={me.image}
                  alt="profile image"
                  fill
                  className="rounded-full border-2 border-stone-200 object-cover"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-sm text-zinc-800">
                {me.name?.[0] ?? "U"}
              </div>
            )}
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-11 w-52 rounded-xl border border-zinc-700 bg-zinc-900 p-3 shadow-xl z-20">
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
    </header>
  );
}
