"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function NewMarketPage() {
  const router = useRouter();
  const createOutcome = (label = "", slug = "") => ({
    id: typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
    label,
    slug,
  });

  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [bettingCloseAt, setBettingCloseAt] = useState("");
  const [resolveAt, setResolveAt] = useState("");
  const [outcomes, setOutcomes] = useState([
    createOutcome("Outcome", "outcome"),
  ]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const canAddOutcome = outcomes.length < 2;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payloadOutcomes = outcomes
        .map((outcome) => ({
          label: outcome.label.trim(),
          slug: outcome.slug.trim(),
        }))
        .filter((outcome) => outcome.label && outcome.slug);

      const res = await apiFetch("/api/markets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          description,
          bettingCloseAt,
          resolveAt: resolveAt || null,
          type: "BINARY",
          outcomes: payloadOutcomes.length > 0 ? payloadOutcomes : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create market");
      }

      router.push("/markets");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to create market"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-8">
      <div className="marketcard-base marketcard-question">
        <h1 className="text-xl font-semibold mb-4">Create market</h1>

        <form
          onSubmit={onSubmit}
          style={{ display: "flex", gap: 12, flexDirection: "column" }}
        >
          <label>
            Question
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
            Event resolves at (optional)
            <input
              className="w-full border marketcard-description rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              type="datetime-local"
              value={resolveAt}
              onChange={(e) => setResolveAt(e.target.value)}
            />
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Outcomes</span>
              <button
                type="button"
                className="button-gold"
                disabled={!canAddOutcome}
                onClick={() =>
                  setOutcomes((prev) => [
                    ...prev,
                    createOutcome(),
                  ])
                }
              >
                Add outcome
              </button>
            </div>
            {!canAddOutcome && (
              <p className="text-sm text-stone-300">
                Binary markets support up to two outcomes.
              </p>
            )}

            <div className="space-y-3">
              {outcomes.map((outcome, index) => (
                <div
                  key={outcome.id}
                  className="flex flex-col gap-2 rounded-lg border border-blue-800/60 bg-blue-950/40 p-3"
                >
                  <label className="text-sm">
                    Label
                    <input
                      className="w-full border marketcard-description rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      value={outcome.label}
                      onChange={(e) =>
                        setOutcomes((prev) =>
                          prev.map((item, idx) =>
                            idx === index
                              ? { ...item, label: e.target.value }
                              : item,
                          ),
                        )
                      }
                      required
                    />
                  </label>
                  <label className="text-sm">
                    Slug
                    <input
                      className="w-full border marketcard-description rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      value={outcome.slug}
                      onChange={(e) =>
                        setOutcomes((prev) =>
                          prev.map((item, idx) =>
                            idx === index
                              ? { ...item, slug: e.target.value }
                              : item,
                          ),
                        )
                      }
                      required
                    />
                  </label>

                  {outcomes.length > 1 && (
                    <button
                      type="button"
                      className="text-sm text-red-300 hover:text-red-200 self-start"
                      onClick={() =>
                        setOutcomes((prev) =>
                          prev.filter((_, idx) => idx !== index),
                        )
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && <p style={{ color: "red" }}>{error}</p>}

          <button className="button-gold" type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create market"}
          </button>
        </form>
      </div>
    </div>
  );
}
