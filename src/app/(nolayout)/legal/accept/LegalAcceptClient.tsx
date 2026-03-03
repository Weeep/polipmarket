"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LegalDocumentType } from "@/modules/legal/domain/LegalDocument";

type LegalDocumentCard = {
  documentType: LegalDocumentType;
  version: string;
  effectiveFrom: string;
  sourceFileName: string;
};

type LegalAcceptClientProps = {
  terms: LegalDocumentCard;
  privacy: LegalDocumentCard;
};

export default function LegalAcceptClient({ terms, privacy }: LegalAcceptClientProps) {
  const router = useRouter();
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => acceptTerms && acceptPrivacy && !loading,
    [acceptTerms, acceptPrivacy, loading],
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/legal/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acceptTerms,
          acceptPrivacy,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Az elfogadás mentése sikertelen.");
      }

      router.replace("/");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Az elfogadás mentése sikertelen.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-10 text-stone-100">
      <h1 className="text-2xl font-bold">Jogi dokumentumok elfogadása</h1>
      <p className="text-sm text-stone-300">
        A folytatáshoz mindkét aktuális dokumentum elfogadása kötelező.
      </p>

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-zinc-800 p-5">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(event) => setAcceptTerms(event.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span>
            Elfogadom a(z) <b>{terms.version}</b> verziójú ÁSZF-et (hatálybalépés: {terms.effectiveFrom}).{" "}
            <a
              href={`/assets/${terms.sourceFileName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-300 underline"
            >
              Dokumentum megnyitása
            </a>
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={acceptPrivacy}
            onChange={(event) => setAcceptPrivacy(event.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span>
            Elfogadom a(z) <b>{privacy.version}</b> verziójú adatkezelési tájékoztatót
            (hatálybalépés: {privacy.effectiveFrom}).{" "}
            <a
              href={`/assets/${privacy.sourceFileName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-300 underline"
            >
              Dokumentum megnyitása
            </a>
          </span>
        </label>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className="button-gold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Mentés..." : "Elfogadom a dokumentumokat"}
        </button>
      </form>
    </main>
  );
}
