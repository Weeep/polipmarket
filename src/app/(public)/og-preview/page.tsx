export default function OgPreviewPage() {
  return (
    <main className="min-h-screen bg-zinc-950 p-6 flex items-center justify-center">
      <div className="w-[1200px] h-[630px] bg-gradient-to-br from-zinc-950 to-zinc-900 border border-amber-500/40 rounded-3xl shadow-2xl p-14 flex gap-10 text-slate-100">
        <section className="w-[42%] flex flex-col justify-between">
          <div className="space-y-6">
            <span className="inline-flex w-fit rounded-full border border-amber-400/80 bg-amber-500/10 px-4 py-1 text-amber-300 text-xl font-semibold">
              Polipmarket
            </span>
            <h1 className="text-6xl font-bold leading-tight">
              Fogadj a jövőre,
              <br />
              játékpénzzel.
            </h1>
            <p className="text-2xl text-slate-300 leading-relaxed">
              Magyar predikciós piactér, ahol aktuális gazdasági és politikai
              kérdésekre szavazhatsz, és követheted a közösség várakozásait.
            </p>
          </div>
          <div className="text-slate-400 text-lg">
            polipmarket.hu • Közösségi előrejelzések
          </div>
        </section>

        <section className="flex-1 rounded-2xl border border-amber-500/50 bg-zinc-950/70 p-7 flex flex-col">
          <div className="mb-5">
            <div className="text-amber-300 text-base font-semibold mb-2">Minta piac</div>
            <h2 className="text-3xl font-semibold leading-tight">
              Mennyi lesz az infláció márciusban?
            </h2>
          </div>

          <div className="space-y-3 flex-1">
            {[
              ["2,0% alatt", "0.15", "0.85"],
              ["2,0% – 2,49%", "0.30", "0.70"],
              ["2,5% – 2,99%", "0.28", "0.72"],
              ["3,0% – 3,49%", "0.17", "0.83"],
              ["3,5% vagy felette", "0.10", "0.90"],
            ].map(([label, yes, no]) => (
              <div
                key={label}
                className="rounded-xl border border-amber-500/50 bg-zinc-900/70 px-4 py-3 flex items-center justify-between"
              >
                <div className="text-xl font-semibold">{label}</div>
                <div className="flex gap-2 text-base font-semibold">
                  <span className="rounded-lg bg-blue-900/50 border border-blue-500/50 px-3 py-1.5">
                    IGEN ({yes})
                  </span>
                  <span className="rounded-lg bg-blue-900/30 border border-blue-500/40 px-3 py-1.5">
                    NEM ({no})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
