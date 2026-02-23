"use client";

import { signIn } from "next-auth/react";

export default function AboutPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10 md:min-h-[calc(100vh-9rem)] md:flex-row md:items-center md:gap-16">
      <section className="w-full space-y-6 md:w-2/3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
          Üdv a Polipmarketen
        </p>
        <h1 className="text-3xl font-bold leading-tight text-stone-100 md:text-5xl">
          Itt játékosan fogadhatsz valós események kimenetelére.
        </h1>
        <div className="space-y-4 text-base leading-relaxed text-stone-300 md:text-lg">
          <p>
            A Polipmarket egy közösségi előrejelző oldal: kérdésekre lehet
            „IGEN” vagy „NEM” oldalon tippet tenni, például arra, hogy mi fog
            történni a sportban, a technológiában vagy a világban.
          </p>
          <p>
            Nem kell hozzá pénzügyi tudás: egyszerűen kiválasztod, szerinted mi
            valószínűbb, és ennek megfelelően vásárolsz részesedést. Ha jól
            tippelsz, növelheted az egyenlegedet.
          </p>
          <p>
            A bejelentkezés Google-fiókkal történik, így gyorsan és biztonságosan
            tudsz csatlakozni. Belépés után azonnal láthatod az aktív eseményeket
            és leadhatod az első tippedet.
          </p>
        </div>
      </section>

      <aside className="flex w-full items-center justify-center md:w-1/3">
        <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 text-center shadow-xl shadow-black/20">
          <p className="mb-6 text-sm text-stone-300">Kezdd el pár kattintással.</p>
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="button-gold w-full"
          >
            Sign in with Google
          </button>
        </div>
      </aside>
    </main>
  );
}
