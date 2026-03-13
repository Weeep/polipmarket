"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { LegalAcceptanceNotice } from "@/components/LegalAcceptanceNotice";

export default function AboutPage() {
  const [recoveryKey, setRecoveryKey] = useState("");
  const [recoverError, setRecoverError] = useState<string | null>(null);
  const [isRecoverSubmitting, setIsRecoverSubmitting] = useState(false);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);

  function setAutoLegalAcceptCookie() {
    document.cookie =
      "pm_auto_legal_accept=1; Path=/; Max-Age=600; SameSite=Lax";
  }

  const handleGoogleSignIn = () => {
    setAutoLegalAcceptCookie();
    void signIn("google", { callbackUrl: "/" });
  };

  const handleGuestCreate = () => {
    setAutoLegalAcceptCookie();
    void signIn("guest", { mode: "create", callbackUrl: "/" });
  };

  async function handleGuestRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRecoverError(null);
    setIsRecoverSubmitting(true);

    try {
      setAutoLegalAcceptCookie();
      const result = await signIn("guest", {
        mode: "recover",
        recoveryKey: recoveryKey.trim(),
        callbackUrl: "/",
        redirect: false,
      });

      if (!result || result.error) {
        setRecoverError("A megadott kulcs érvénytelen.");
        return;
      }

      window.location.href = result.url || "/";
    } catch {
      setRecoverError("A belépés sikertelen. Próbáld újra.");
    } finally {
      setIsRecoverSubmitting(false);
    }
  }

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
            Beléphetsz Google-fiókkal, vagy választhatod a vendég módot is.
            Vendégként egy visszaállító kulcsot kapsz, amivel később másik
            eszközről is beléphetsz.
          </p>
          <p className="font-semibold text-amber-200">
            A Polipmarketet kizárólag 18 éven felüliek használhatják. Ha még nem
            múltál el 18 éves, kérjük, zárd be az oldalt.
          </p>
        </div>
      </section>

      <aside className="flex w-full items-center justify-center md:w-1/3">
        <div className="w-full max-w-sm border border-zinc-800 bg-zinc-950 p-8 text-center shadow-xl shadow-black/20">
          <h2 className="text-4xl font-semibold text-stone-100">Belépés</h2>
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
              <span>Google fiókkal</span>
            </span>
          </button>

          <button
            type="button"
            onClick={handleGuestCreate}
            className="mt-3 w-full"
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
              <span className="text-lg leading-none" aria-hidden="true">
                🐙
              </span>
              <span>Vendégként</span>
            </span>
          </button>

          <div className="mt-5 text-left">
            <button
              type="button"
              onClick={() => setIsRecoveryOpen((previous) => !previous)}
              aria-expanded={isRecoveryOpen}
              className="text-sm font-medium text-amber-300 underline underline-offset-2 transition hover:text-amber-200"
            >
              Már van vendég kulcsom
            </button>

            {isRecoveryOpen && (
              <form onSubmit={handleGuestRecovery} className="mt-3 space-y-2">
                <input
                  id="guest-recovery-key"
                  type="text"
                  value={recoveryKey}
                  onChange={(event) => setRecoveryKey(event.target.value)}
                  placeholder="pmkt_..."
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-amber-400 focus:outline-none"
                />
                {recoverError && (
                  <p className="text-xs text-rose-300">{recoverError}</p>
                )}
                <button
                  type="submit"
                  disabled={isRecoverSubmitting}
                  className="w-full rounded-md border border-zinc-600 px-3 py-2 text-sm font-medium text-stone-200 transition hover:bg-zinc-800 disabled:opacity-60"
                >
                  {isRecoverSubmitting
                    ? "Beléptetés folyamatban..."
                    : "Belépés vendég kulccsal"}
                </button>
              </form>
            )}
          </div>

          <LegalAcceptanceNotice
            triggerText="belépéssel"
            className="mt-6 text-left text-xs leading-relaxed text-stone-300"
          />
        </div>
      </aside>
    </main>
  );
}
