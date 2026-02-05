"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function NewMarketPage() {
  const router = useRouter();

  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [closeAt, setCloseAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiFetch("/api/markets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          description,
          closeAt,
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
            Close at
            <input
              className="w-full border marketcard-description rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              type="datetime-local"
              value={closeAt}
              onChange={(e) => setCloseAt(e.target.value)}
              required
            />
          </label>

          {error && <p style={{ color: "red" }}>{error}</p>}

          <button className="button-gold" type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create market"}
          </button>
        </form>
      </div>
    </div>
  );
}
