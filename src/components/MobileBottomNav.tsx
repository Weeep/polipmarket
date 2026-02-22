"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/events", label: "Események", emoji: "📅" },
  { href: "/myorders", label: "Fogadásaim", emoji: "🎯" },
  { href: "/achievements", label: "Sikerek", emoji: "🏆" },
  { href: "/events/new", label: "Új Esemény", emoji: "➕" },
] as const;

type MobileBottomNavProps = {
  mode?: "mobile" | "desktop";
};

export function MobileBottomNav({ mode = "mobile" }: MobileBottomNavProps) {
  const pathname = usePathname();
  const isDesktop = mode === "desktop";

  return (
    <nav
      className={
        isDesktop
          ? "hidden md:block w-full"
          : "fixed inset-x-0 bottom-0 z-30 border-t border-amber-400/25 bg-zinc-950/95 px-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] pt-2 backdrop-blur md:hidden"
      }
    >
      <ul
        className={
          isDesktop
            ? "mx-auto grid max-w-lg grid-cols-4 gap-1"
            : "mx-auto grid max-w-md grid-cols-4 gap-1"
        }
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <li key={item.label}>
              <Link
                href={item.href}
                className={`flex min-h-14 flex-col items-center justify-center rounded-xl px-1 py-1 text-[11px] font-medium transition ${
                  isActive
                    ? "bg-amber-500/15 text-amber-300"
                    : "text-stone-300 hover:bg-zinc-800 hover:text-amber-200"
                }`}
              >
                <span className="text-base leading-none">{item.emoji}</span>
                <span className="mt-1 text-center leading-tight">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
