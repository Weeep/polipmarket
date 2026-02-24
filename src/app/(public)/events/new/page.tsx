"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { DEFAULT_AMM_FEE_BPS } from "@/config/economy";

type DraftMarket = {
  id: string;
  name: string;
  yesStartPercent: number;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function normalizeYesStartPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 50;
  }

  return Math.min(97, Math.max(3, Math.round(value)));
}

export default function NewEventPage() {
  const router = useRouter();
  const createMarket = (): DraftMarket => ({
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    name: "",
    yesStartPercent: 50,
  });

  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [bettingCloseAt, setBettingCloseAt] = useState("");
  const [resolveAt, setResolveAt] = useState("");
  const [markets, setMarkets] = useState<DraftMarket[]>([createMarket()]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payloadMarkets = markets
        .map((market) => ({
          name: market.name.trim(),
          yesStartPercent: normalizeYesStartPercent(market.yesStartPercent),
        }))
        .filter((market) => market.name);

      if (payloadMarkets.length === 0) {
        throw new Error("At least one market is required");
      }

      const res = await apiFetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          description,
          bettingCloseAt,
          resolveAt: resolveAt || null,
          markets: payloadMarkets,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create event");
      }

      router.push("/events");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to create event"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-4 rounded-lg border border-stone-200/60 bg-stone-800/40 p-4 text-sm text-stone-100">
        <p className="font-semibold">Új esemény beküldése</p>
        <p className="mt-2">
          Ezen az oldalon új eseményt hozhatsz létre. Kérjük, olyan kérdést adj
          meg, ahol a végső eredmény objektív és egyértelműen eldönthető IGEN
          vagy NEM formában.
        </p>
        <p className="mt-2">
          A beküldött eseményeket admin ellenőrzi és hagyja jóvá. Jóváhagyott
          esemény esetén a létrehozó 100ଳ jutalmat kap.
        </p>
        <p className="mt-2">
          Fontos: jelenleg nem küldünk külön értesítést a jóváhagyásról vagy
          elutasításról. A státuszt onnan látod, hogy az esemény megjelenik-e az
          Események között.
        </p>
      </div>

      <div className="marketcard-base marketcard-question">
        <form
          onSubmit={onSubmit}
          style={{ display: "flex", gap: 12, flexDirection: "column" }}
        >
          <label>
            Kérdés<span className="text-red-600">*</span>
            <input
              className="w-full border marketcard-description rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
          </label>

          <label>
            Leírás
            <textarea
              className="w-full border marketcard-description rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <label>
            Fogadás vége<span className="text-red-600">*</span>
            <input
              className="w-full border marketcard-description rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              type="datetime-local"
              value={bettingCloseAt}
              onChange={(e) => setBettingCloseAt(e.target.value)}
              required
            />
          </label>

          <label>
            Esemény vége<span className="text-red-600">*</span>
            <input
              className="w-full border marketcard-description rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              type="datetime-local"
              value={resolveAt}
              onChange={(e) => setResolveAt(e.target.value)}
              required
            />
          </label>

          <label className="hidden">
            Fee (bps)
            <input
              className="w-full border marketcard-description rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              type="number"
              value={DEFAULT_AMM_FEE_BPS}
              readOnly
            />
          </label>

          <div className="space-y-2">
            <div>
              Válasz(ok)<span className="text-red-600">*</span>
            </div>

            <div className="space-y-3">
              {markets.map((market, index) => {
                const noStartPercent =
                  100 - normalizeYesStartPercent(market.yesStartPercent);

                return (
                  <div
                    key={market.id}
                    className="flex flex-col gap-2 rounded-lg border border-stone-200/60 bg-stone-700/40 p-3"
                  >
                    <label className="text-sm">
                      Válasz
                      <input
                        className="w-full border marketcard-description rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                        value={market.name}
                        onChange={(e) =>
                          setMarkets((prev) =>
                            prev.map((item, idx) =>
                              idx === index
                                ? { ...item, name: e.target.value }
                                : item,
                            ),
                          )
                        }
                        required
                      />
                    </label>

                    <div className="flex gap-2">
                      <label className="text-sm w-1/2">
                        Yes esély (%):
                        <input
                          className="ml-2 border marketcard-description rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                          type="number"
                          min="10"
                          max="90"
                          value={market.yesStartPercent}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            if (Number.isFinite(value)) {
                              setMarkets((prev) =>
                                prev.map((item, idx) =>
                                  idx === index
                                    ? {
                                        ...item,
                                        yesStartPercent:
                                          normalizeYesStartPercent(value),
                                      }
                                    : item,
                                ),
                              );
                            }
                          }}
                          required
                        />
                      </label>

                      <label className="text-sm w-1/2">
                        No esély (%):
                        <input
                          className="ml-2 mt-2 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                          type="number"
                          value={noStartPercent}
                          readOnly
                        />
                      </label>
                    </div>

                    {markets.length > 1 && (
                      <button
                        type="button"
                        className="text-sm text-red-300 hover:text-red-200 self-start"
                        onClick={() =>
                          setMarkets((prev) =>
                            prev.filter((_, idx) => idx !== index),
                          )
                        }
                      >
                        Törlés
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="button-black"
                onClick={() => setMarkets((prev) => [...prev, createMarket()])}
              >
                Új válasz
              </button>
            </div>
          </div>

          {error && <p style={{ color: "red" }}>{error}</p>}

          <button className="button-gold" type="submit" disabled={loading}>
            {loading ? "Készül…" : "Mehet"}
          </button>
        </form>
      </div>
    </div>
  );
}
