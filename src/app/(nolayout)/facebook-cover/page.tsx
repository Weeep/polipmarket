"use client";

import { useRef, useState } from "react";

const outcomes = [
  { label: "IGEN", value: "0.81" },
  { label: "NEM", value: "0.19" },
];

type Mode = "cover" | "post";

export default function FacebookCoverPage() {
  const [mode, setMode] = useState<Mode>("cover");
  const [isOctopusForeground, setIsOctopusForeground] = useState(false);
  const [postText, setPostText] = useState(
    "Szerinted mi fog történni a magyar politikában?",
  );
  const [isExporting, setIsExporting] = useState(false);

  const coverRef = useRef<HTMLDivElement>(null);
  const postRef = useRef<HTMLDivElement>(null);

  const copyComputedStyles = (source: Element, target: Element) => {
    const computedStyles = window.getComputedStyle(source);
    const inlineStyles = Array.from(computedStyles)
      .map((property) => `${property}:${computedStyles.getPropertyValue(property)};`)
      .join("");

    target.setAttribute("style", inlineStyles);

    const sourceChildren = Array.from(source.children);
    const targetChildren = Array.from(target.children);

    sourceChildren.forEach((sourceChild, index) => {
      const targetChild = targetChildren[index];

      if (!targetChild) {
        return;
      }

      copyComputedStyles(sourceChild, targetChild);
    });
  };

  const exportCurrentAsPng = async () => {
    const target = mode === "cover" ? coverRef.current : postRef.current;

    if (!target) {
      return;
    }

    setIsExporting(true);

    try {
      const width = target.clientWidth;
      const height = target.clientHeight;
      const clonedNode = target.cloneNode(true) as HTMLElement;

      clonedNode.style.margin = "0";
      copyComputedStyles(target, clonedNode);

      const wrapper = document.createElement("div");
      wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
      wrapper.style.width = `${width}px`;
      wrapper.style.height = `${height}px`;
      wrapper.appendChild(clonedNode);

      const serialized = new XMLSerializer().serializeToString(wrapper);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${serialized}</foreignObject></svg>`;
      const svgBlob = new Blob([svg], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();

        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Nem sikerült a kép renderelése."));
        img.src = url;
      });

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("A böngésző nem támogatja a canvas exportot.");
      }

      context.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(url);

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `polipmarket-${mode}.png`;
      link.click();
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
            ref={coverRef}
            className="relative w-[1640px] h-[624px] overflow-hidden border border-amber-500/40 bg-[#0a0704] text-amber-100"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(255,184,77,0.24),transparent_56%),linear-gradient(140deg,#0d0804_0%,#2e1b0a_55%,#100a05_100%)]" />

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
            ref={postRef}
            className="relative w-[1080px] h-[1080px] overflow-hidden border border-amber-500/40 bg-[#0a0704] text-amber-100"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,184,77,0.22),transparent_50%),linear-gradient(145deg,#0d0804_0%,#2d1c0d_58%,#100a05_100%)]" />

            <div className="absolute -left-14 top-[286px] text-[330px] font-bold leading-none text-amber-500/16 select-none">
              🐙
            </div>

            <div className="relative z-10 flex h-full flex-col items-center justify-center px-24 text-center">
              <p className="max-w-[860px] text-[66px] font-bold leading-tight text-amber-100">
                {postText}
              </p>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[#0a0704] via-[#0a0704]/90 to-transparent px-20 pb-12 pt-24 text-center">
              <p className="text-[52px] font-black tracking-wide text-amber-200/75">
                POLIPMARKET
              </p>
              <p className="mt-1 text-[25px] font-semibold text-amber-200/60">
                Fogadás • Piac • Stratégia
              </p>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
