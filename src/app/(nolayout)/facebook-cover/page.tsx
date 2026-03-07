const outcomes = [
  { label: "IGEN", value: "0.81" },
  { label: "NEM", value: "0.19" },
];

export default function FacebookCoverPage() {
  return (
    <main className="min-h-screen bg-[#090704] p-8 flex items-center justify-center overflow-auto">
      <div className="relative w-[1640px] h-[624px] overflow-hidden border border-amber-500/40 bg-[#0a0704] text-amber-100 shadow-[0_0_120px_rgba(251,191,36,0.2)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(255,184,77,0.28),transparent_55%),radial-gradient(circle_at_15%_75%,rgba(255,125,24,0.15),transparent_45%),radial-gradient(circle_at_80%_15%,rgba(255,145,42,0.16),transparent_48%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(255,188,95,0.1)_0%,transparent_30%,rgba(255,142,34,0.15)_70%,transparent_100%)]" />

        <div className="absolute -left-10 top-20 h-[420px] w-[420px] rounded-full border border-amber-600/20" />
        <div className="absolute -left-28 top-36 h-[380px] w-[380px] rounded-full border border-amber-700/20" />
        <div className="absolute right-[-120px] bottom-[-100px] h-[340px] w-[640px] rounded-[50%] border border-amber-500/20" />

        <div className="absolute inset-x-[120px] top-[138px] h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent shadow-[0_0_18px_rgba(251,191,36,0.8)]" />
        <div className="absolute inset-x-[120px] bottom-[106px] h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent shadow-[0_0_18px_rgba(251,191,36,0.8)]" />

        <div className="absolute -left-16 top-[206px] text-[310px] font-bold leading-none text-amber-500/10 select-none">
          🐙
        </div>

        <div className="absolute inset-0 [background-image:radial-gradient(rgba(255,190,93,0.65)_1px,transparent_1px)] [background-size:18px_18px] opacity-35" />

        <div className="relative z-10 flex h-full flex-col items-center justify-center px-20 text-center">
          <h1 className="text-[100px] font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 drop-shadow-[0_0_22px_rgba(255,183,77,0.45)]">
            POLIPMARKET
          </h1>

          <p className="mt-1 whitespace-nowrap text-[40px] font-semibold text-amber-200 drop-shadow-[0_0_14px_rgba(251,191,36,0.5)]">
            Magyar fogadási piac játékpénzzel
          </p>

          <div className="mt-7 inline-flex items-center gap-8 rounded-[30px] border border-amber-400/70 bg-black/35 px-8 py-5 shadow-[0_0_30px_rgba(251,191,36,0.28)] backdrop-blur-[1px]">
            {outcomes.map((option) => (
              <div
                key={option.label}
                className="inline-flex items-center gap-5 rounded-2xl border border-amber-500/70 bg-gradient-to-b from-[#3a2514]/95 to-[#18110b]/95 px-10 py-4 shadow-[inset_0_1px_0_rgba(255,223,149,0.35),0_0_18px_rgba(251,191,36,0.22)]"
              >
                <span className="text-[54px] font-extrabold leading-none text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500">
                  {option.label}
                </span>
                <span className="text-[46px] font-medium text-amber-200/95">
                  {option.value}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-7 text-[48px] font-semibold text-amber-200/90">
            Fogadás • Piac • Stratégia
          </p>
        </div>
      </div>
    </main>
  );
}
