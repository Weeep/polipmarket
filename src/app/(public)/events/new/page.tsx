"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";

type DraftMarket = {
  id: string;
  name: string;
  description: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function NewEventPage() {
  const router = useRouter();
  const createMarket = (): DraftMarket => ({
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    name: "",
    description: "",
  });

  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [bettingCloseAt, setBettingCloseAt] = useState("");
  const [resolveAt, setResolveAt] = useState("");
  const [feeBps, setFeeBps] = useState(100);
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
          description: market.description.trim(),
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
          feeBps,
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
      <div className="marketcard-base marketcard-question">
        <h1 className="text-xl font-semibold mb-4">Create event</h1>

        <form
          onSubmit={onSubmit}
          style={{ display: "flex", gap: 12, flexDirection: "column" }}
        >
          <label>
            Event question
            <input
              className="w-full border marketcard-description rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
          </label>

          <label>
            Description (optional)
            <textarea
              className="w-full border marketcard-description rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <label>
            Betting closes at
            <input
              className="w-full border marketcard-description rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              type="datetime-local"
              value={bettingCloseAt}
              onChange={(e) => setBettingCloseAt(e.target.value)}
              required
            />
          </label>

          <label>
            Event resolves at
            <input
              className="w-full border marketcard-description rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              type="datetime-local"
              value={resolveAt}
              onChange={(e) => setResolveAt(e.target.value)}
              required
            />
          </label>

          <label>
            Fee (bps, default 100 = 1%)
            <input
              className="w-full border marketcard-description rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              type="number"
              min="0"
              max="1000"
              value={feeBps}
              onChange={(e) => setFeeBps(Number(e.target.value))}
            />
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Markets</span>
              <button
                type="button"
                className="button-gold"
                onClick={() => setMarkets((prev) => [...prev, createMarket()])}
              >
                Add market
              </button>
            </div>

            <div className="space-y-3">
              {markets.map((market, index) => (
                <div
                  key={market.id}
                  className="flex flex-col gap-2 rounded-lg border border-blue-800/60 bg-blue-950/40 p-3"
                >
                  <label className="text-sm">
                    Market name
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
                  <label className="text-sm">
                    Market description (optional)
                    <textarea
                      className="w-full border marketcard-description rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      value={market.description}
                      onChange={(e) =>
                        setMarkets((prev) =>
                          prev.map((item, idx) =>
                            idx === index
                              ? { ...item, description: e.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>

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
                      Remove market
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && <p style={{ color: "red" }}>{error}</p>}

          <button className="button-gold" type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create event"}
          </button>
        </form>
      </div>
    </div>
  );
}
