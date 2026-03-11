"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";

export default function AboutPage() {
  const handleGoogleSignIn = () => {
    document.cookie =
      "pm_auto_legal_accept=1; Path=/; Max-Age=600; SameSite=Lax";

    void signIn("google", { callbackUrl: "/" });
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10 md:min-h-[calc(100vh-9rem)] md:flex-row md:items-center md:gap-16">
      <section className="w-full space-y-6 md:w-2/3">
        <p className="text-m font-semibold uppercase tracking-[0.2em] text-amber-300">
          <b>Üdv a Polipmarketen! </b>
          <span className="text-sm">
            a polymarket játékpénzes magyar verzióján
          </span>
        </p>
        <h1 className="text-3xl font-bold leading-tight text-stone-100 md:text-5xl">
          Itt játékosan fogadhatsz valós események kimenetelére.
        </h1>
        <div className="space-y-4 text-base leading-relaxed text-stone-300 md:text-lg">
          <p>
            A Polipmarket egy közösségi előrejelző oldal: kérdésekre lehet
            „IGEN” vagy „NEM” oldalon tippet tenni, manapság leginkább arra,
            hogy mi fog történni a magyar politikában, de akár arra is, hogy mi
            fog a sportban, a technológiában vagy a világban.
          </p>
          <p>
            Nem kell hozzá pénzügyi tudás: egyszerűen kiválasztod, szerinted mi
            valószínűbb, és ennek megfelelően vásárolsz részesedést. Ha jól
            tippelsz, növelheted az egyenlegedet.
          </p>
          <p>
            A bejelentkezés Google-fiókkal történik, így gyorsan és
            biztonságosan tudsz csatlakozni. Belépés után azonnal láthatod az
            aktív eseményeket és leadhatod az első tippedet.
          </p>
          <p className="font-semibold text-amber-200">
            A Polipmarketet kizárólag 18 éven felüliek használhatják. Ha még nem
            múltál el 18 éves, kérjük, zárd be az oldalt.
          </p>
        </div>
      </section>

      <aside className="flex w-full items-center justify-center md:w-1/3">
        <div className="w-full max-w-sm border border-zinc-800 bg-zinc-950 p-8 text-center shadow-xl shadow-black/20">
          <h2 className="text-4xl font-semibold text-stone-100">
            Bejelentkezés
          </h2>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="mt-8 w-full"
          >
            <span
              className="cursor-pointer
      flex h-14 w-full items-center justify-center gap-3
      border border-black/50 bg-white
      px-4 text-[15px] font-medium text-[#1f1f1f]
      shadow-[0_1px_2px_rgba(0,0,0,0.08)]
      transition hover:bg-[#f8f8f8]
    "
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="h-5 w-5"
              />
              <span>Bejelentkezés Google fiókkal</span>
            </span>
          </button>
          <p className="mt-6 text-left text-xs leading-relaxed text-stone-300">
            * A belépéssel elfogadod az{" "}
            <span className="inline">
              <Link
                href="/assets/aszf.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-300 underline hover:text-amber-200"
              >
                Általános Szerződési Feltételeket
              </Link>{" "}
              és az{" "}
              <Link
                href="/assets/adatkezelesi_tajekoztato.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-300 underline hover:text-amber-200"
              >
                Adatkezelési Tájékoztatót
              </Link>
              .
            </span>
          </p>
        </div>
      </aside>
    </main>
  );
}
