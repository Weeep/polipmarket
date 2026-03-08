"use client";

import { useMemo, useState } from "react";

const outcomes = [
  { label: "IGEN", value: "0.81" },
  { label: "NEM", value: "0.19" },
];

const solidBackgrounds = [
  "#120a04",
  "#1a0f06",
  "#261507",
  "#2f1908",
  "#000000",
];

type Mode = "cover" | "post";

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);

  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => {
    ctx.fillText(line, x, startY + index * lineHeight);
  });
}

function downloadCanvas(canvas: HTMLCanvasElement, fileName: string) {
  canvas.toBlob((blob) => {
    if (!blob) {
      window.alert("Az export nem sikerült ebben a böngészőben.");
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

export default function FacebookCoverPage() {
  const [mode, setMode] = useState<Mode>("cover");
  const [isOctopusForeground, setIsOctopusForeground] = useState(false);
  const [postText, setPostText] = useState(
    "Szerinted mi fog történni a magyar politikában?",
  );
  const [isExporting, setIsExporting] = useState(false);
  const [useGradientBackground, setUseGradientBackground] = useState(true);
  const [solidBackground, setSolidBackground] = useState(solidBackgrounds[1]);

  const previewBackgroundStyle = useMemo(
    () =>
      useGradientBackground
        ? undefined
        : { backgroundColor: solidBackground, backgroundImage: "none" },
    [solidBackground, useGradientBackground],
  );

  const exportCurrentAsPng = () => {
    setIsExporting(true);

    try {
      if (mode === "cover") {
        const width = 1640;
        const height = 624;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context hiba");

        if (useGradientBackground) {
          const bg = ctx.createLinearGradient(0, 0, width, height);
          bg.addColorStop(0, "#0d0804");
          bg.addColorStop(0.55, "#2e1b0a");
          bg.addColorStop(1, "#100a05");
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, width, height);

          const glow = ctx.createRadialGradient(
            width * 0.5,
            height * 0.22,
            20,
            width * 0.5,
            height * 0.22,
            400,
          );
          glow.addColorStop(0, "rgba(255,184,77,0.25)");
          glow.addColorStop(1, "rgba(255,184,77,0)");
          ctx.fillStyle = glow;
          ctx.fillRect(0, 0, width, height);
        } else {
          ctx.fillStyle = solidBackground;
          ctx.fillRect(0, 0, width, height);
        }

        ctx.strokeStyle = "rgba(245,180,80,0.2)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(120, 200, 180, 0, Math.PI * 2);
        ctx.stroke();

        if (!isOctopusForeground) {
          ctx.font =
            "300px Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif";
          ctx.fillStyle = "rgba(245,170,90,0.14)";
          ctx.fillText("🐙", 20, 500);
        }

        ctx.textAlign = "center";
        ctx.fillStyle = "#f4c46f";
        ctx.font = "900 120px Inter, Arial, sans-serif";
        ctx.fillText("POLIPMARKET", width / 2, 185);

        ctx.fillStyle = "#f4d493";
        ctx.font = "600 56px Inter, Arial, sans-serif";
        ctx.fillText("Magyar fogadási piac játékpénzzel", width / 2, 255);

        const boxX = width / 2 - 360;
        const boxY = 300;
        const boxW = 720;
        const boxH = 130;
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.strokeStyle = "rgba(245,180,80,0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 24);
        ctx.fill();
        ctx.stroke();

        outcomes.forEach((option, index) => {
          const cardW = 320;
          const cardH = 92;
          const gap = 24;
          const x = boxX + 24 + index * (cardW + gap);
          const y = boxY + 19;

          ctx.fillStyle = "#1c140d";
          ctx.strokeStyle = "rgba(245,180,80,0.55)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(x, y, cardW, cardH, 18);
          ctx.fill();
          ctx.stroke();

          ctx.textAlign = "left";
          ctx.fillStyle = "#f4c46f";
          ctx.font = "800 60px Inter, Arial, sans-serif";
          ctx.fillText(option.label, x + 36, y + 66);
          ctx.font = "500 58px Inter, Arial, sans-serif";
          ctx.fillStyle = "#f2d9a7";
          ctx.fillText(option.value, x + 190, y + 66);
        });

        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(245,220,170,0.95)";
        ctx.font = "600 56px Inter, Arial, sans-serif";
        ctx.fillText("Fogadás • Piac • Stratégia", width / 2, 530);

        if (isOctopusForeground) {
          ctx.font =
            "330px Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif";
          ctx.fillStyle = "#eab86d";
          ctx.fillText("🐙", 35, 500);
        }

        downloadCanvas(canvas, "polipmarket-cover.png");
      } else {
        const width = 1080;
        const height = 1080;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context hiba");

        if (useGradientBackground) {
          const bg = ctx.createLinearGradient(0, 0, width, height);
          bg.addColorStop(0, "#0d0804");
          bg.addColorStop(0.58, "#2d1c0d");
          bg.addColorStop(1, "#100a05");
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, width, height);

          const glow = ctx.createRadialGradient(
            width * 0.5,
            height * 0.2,
            20,
            width * 0.5,
            height * 0.2,
            360,
          );
          glow.addColorStop(0, "rgba(255,184,77,0.22)");
          glow.addColorStop(1, "rgba(255,184,77,0)");
          ctx.fillStyle = glow;
          ctx.fillRect(0, 0, width, height);
        } else {
          ctx.fillStyle = solidBackground;
          ctx.fillRect(0, 0, width, height);
        }

        ctx.font =
          "320px Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif";
        ctx.fillStyle = "rgba(245,170,90,0.16)";
        ctx.fillText("🐙", 20, 640);

        ctx.textAlign = "center";
        ctx.fillStyle = "#eab308";
        ctx.font = "800 70px Inter, Arial, sans-serif";
        drawWrappedText(ctx, postText, width / 2, 560, 860, 92);

        const bottomGradient = ctx.createLinearGradient(0, 820, 0, height);
        bottomGradient.addColorStop(0, "rgba(10,7,4,0)");
        bottomGradient.addColorStop(0.35, "rgba(10,7,4,0.9)");
        bottomGradient.addColorStop(1, "rgba(10,7,4,1)");
        ctx.fillStyle = bottomGradient;
        ctx.fillRect(0, 780, width, 300);

        ctx.fillStyle = "rgba(244,210,145,0.82)";
        ctx.font = "900 66px Inter, Arial, sans-serif";
        ctx.fillText("POLIPMARKET", width / 2, 942);

        ctx.fillStyle = "rgba(244,210,145,0.65)";
        ctx.font = "600 42px Inter, Arial, sans-serif";
        ctx.fillText("Fogadás • Piac • Stratégia • Játék", width / 2, 992);

        downloadCanvas(canvas, "polipmarket-post.png");
      }
    } catch (error) {
      console.error(error);
      window.alert("Az export nem sikerült ebben a böngészőben.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#090704] p-8 flex flex-col items-center justify-center gap-4 overflow-auto">
      <div className="inline-flex items-center rounded-full border border-amber-400/60 bg-black/40 p-1 text-amber-200">
        <button
          type="button"
          onClick={() => setMode("cover")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            mode === "cover"
              ? "bg-amber-500/40 text-amber-100"
              : "text-amber-300/80"
          }`}
        >
          Borító
        </button>
        <button
          type="button"
          onClick={() => setMode("post")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            mode === "post"
              ? "bg-amber-500/40 text-amber-100"
              : "text-amber-300/80"
          }`}
        >
          Poszt
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-amber-400/40 bg-black/35 px-4 py-3">
        <label className="inline-flex items-center gap-2 text-amber-200 text-sm font-semibold">
          <input
            type="checkbox"
            checked={useGradientBackground}
            onChange={(event) => setUseGradientBackground(event.target.checked)}
            className="h-4 w-4 accent-amber-400"
          />
          Gradient háttér
        </label>

        {!useGradientBackground && (
          <div className="inline-flex items-center gap-2">
            {solidBackgrounds.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSolidBackground(color)}
                className={`h-7 w-7 rounded-full border ${
                  solidBackground === color
                    ? "border-amber-200"
                    : "border-amber-700/60"
                }`}
                style={{ backgroundColor: color }}
                title={`Háttérszín: ${color}`}
              />
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={exportCurrentAsPng}
        disabled={isExporting}
        className="rounded-full border border-amber-400/70 bg-amber-500/20 px-5 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isExporting ? "Export folyamatban..." : "Export PNG"}
      </button>

      {mode === "cover" ? (
        <>
          <label className="inline-flex items-center gap-3 rounded-full border border-amber-400/60 bg-black/40 px-4 py-2 text-amber-200">
            <span className="text-sm font-semibold tracking-wide">
              Polip előtér mód
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isOctopusForeground}
              onClick={() => setIsOctopusForeground((prev) => !prev)}
              className={`relative h-7 w-14 rounded-full border transition-colors ${
                isOctopusForeground
                  ? "border-amber-300/80 bg-amber-500/40"
                  : "border-amber-700/60 bg-zinc-900/80"
              }`}
            >
              <span
                className={`absolute top-0.5 h-[22px] w-[22px] rounded-full bg-amber-200 transition-transform ${
                  isOctopusForeground ? "translate-x-7" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>

          <div
            className="relative w-[1640px] h-[624px] overflow-hidden border border-amber-500/40 bg-[#0a0704] text-amber-100"
            style={previewBackgroundStyle}
          >
            {useGradientBackground && (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(255,184,77,0.24),transparent_56%),linear-gradient(140deg,#0d0804_0%,#2e1b0a_55%,#100a05_100%)]" />
            )}

            <div className="absolute -left-10 top-20 h-[420px] w-[420px] rounded-full border border-amber-600/15" />
            <div className="absolute right-[-120px] bottom-[-100px] h-[340px] w-[640px] rounded-[50%] border border-amber-500/15" />

            {!isOctopusForeground && (
              <div className="absolute -left-16 top-[206px] text-[300px] font-bold leading-none text-amber-500/15 select-none">
                🐙
              </div>
            )}

            {isOctopusForeground && (
              <div className="pointer-events-none absolute -left-14 top-[184px] z-20 text-[330px] font-bold leading-none text-amber-400 select-none">
                🐙
              </div>
            )}

            <div className="relative z-10 flex h-full flex-col items-center justify-center px-20 text-center">
              <h1 className="text-[100px] font-black tracking-wide text-amber-300">
                POLIPMARKET
              </h1>

              <p className="mt-1 whitespace-nowrap text-[40px] font-semibold text-amber-200">
                Magyar fogadási piac játékpénzzel
              </p>

              <div className="mt-7 inline-flex items-center gap-8 rounded-[26px] border border-amber-400/60 bg-black/35 px-8 py-5">
                {outcomes.map((option) => (
                  <div
                    key={option.label}
                    className="inline-flex items-center gap-5 rounded-2xl border border-amber-500/60 bg-[#1c140d] px-10 py-4"
                  >
                    <span className="text-[54px] font-extrabold leading-none text-amber-300">
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
        </>
      ) : (
        <>
          <label className="w-[900px] max-w-[90vw] rounded-2xl border border-amber-400/50 bg-black/40 p-3 text-amber-200">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-amber-300/80">
              Poszt szöveg
            </span>
            <input
              type="text"
              value={postText}
              onChange={(event) => setPostText(event.target.value)}
              className="w-full rounded-xl border border-amber-500/40 bg-zinc-950/70 px-4 py-3 text-base font-medium text-amber-100 outline-none placeholder:text-amber-200/40 focus:border-amber-300/80"
            />
          </label>

          <div
            className="relative w-[1080px] h-[1080px] overflow-hidden border border-amber-500/40 bg-[#0a0704] text-amber-100"
            style={previewBackgroundStyle}
          >
            {useGradientBackground && (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,184,77,0.22),transparent_50%),linear-gradient(145deg,#0d0804_0%,#2d1c0d_58%,#100a05_100%)]" />
            )}

            <div className="absolute -left-14 top-[286px] text-[330px] font-bold leading-none text-amber-500/16 select-none">
              🐙
            </div>

            <div className="relative z-10 flex h-full flex-col items-center justify-center px-24 text-center">
              <p className="max-w-[860px] text-[66px] font-bold leading-tight text-yellow-500">
                {postText}
              </p>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[#0a0704] via-[#0a0704]/90 to-transparent px-20 pb-12 pt-24 text-center">
              <p className="text-[52px] font-black tracking-wide text-amber-200/75">
                POLIPMARKET
              </p>
              <p className="mt-1 text-[25px] font-semibold text-amber-200/60">
                Fogadás • Piac • Stratégia • Játék
              </p>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
