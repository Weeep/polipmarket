"use client";

import { useSearchParams } from "next/navigation";

type LegalDocumentsAdminFormProps = {
  availableDocuments: string[];
};

function statusText(status: string | null, message: string | null) {
  if (status === "success") {
    return { kind: "success", text: "Jogi dokumentum verzió sikeresen publikálva." };
  }

  if (status === "error") {
    return {
      kind: "error",
      text: message ?? "A jogi dokumentum publikálása sikertelen.",
    };
  }

  return null;
}

export function LegalDocumentsAdminForm({ availableDocuments }: LegalDocumentsAdminFormProps) {
  const searchParams = useSearchParams();
  const status = searchParams.get("legalUpload");
  const message = searchParams.get("message");
  const state = statusText(status, message);

  return (
    <form action="/api/admin/legal-documents/upload" method="post" className="space-y-3">
      <h2 className="mb-1 text-xl font-semibold text-stone-100">Jogi dokumentum verzió publikálása</h2>
      <p className="text-sm text-stone-300">
        Feltöltés helyett a <code className="rounded bg-stone-800 px-1 py-0.5 text-xs">public/assets</code> mappában lévő PDF-ek közül
        választasz. Az új verzió publikálása után az adott dokumentumtípusnál ez lesz
        az aktuális ({"isCurrent"}=true), a korábbi verziók automatikusan
        lekapcsolódnak.
      </p>

      <div className="grid max-w-xl gap-2">
        <label className="grid gap-1 text-sm text-stone-200">
          Dokumentumtípus
          <select
            name="documentType"
            defaultValue="TERMS_OF_SERVICE"
            required
            className="rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100"
          >
            <option value="TERMS_OF_SERVICE">ÁSZF</option>
            <option value="PRIVACY_NOTICE">Adatkezelési tájékoztató</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm text-stone-200">
          Verzió
          <input
            name="version"
            placeholder="pl. 2026-03-03-v2"
            required
            maxLength={120}
            className="rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100"
          />
        </label>

        <label className="grid gap-1 text-sm text-stone-200">
          Hatálybalépés dátuma
          <input
            type="date"
            name="effectiveFrom"
            required
            className="rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100"
          />
        </label>

        <label className="grid gap-1 text-sm text-stone-200">
          Dokumentum a public/assets könyvtárból
          <select
            name="assetFileName"
            required
            defaultValue={availableDocuments[0] ?? ""}
            disabled={availableDocuments.length === 0}
            className="rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 disabled:opacity-60"
          >
            {availableDocuments.length === 0 ? (
              <option value="">Nincs elérhető PDF a public/assets alatt</option>
            ) : null}
            {availableDocuments.map((fileName) => (
              <option key={fileName} value={fileName}>
                {fileName}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={availableDocuments.length === 0}
          className="mt-1 w-fit cursor-pointer rounded-md border border-yellow-500/60 bg-yellow-500/90 px-3 py-2 text-sm font-semibold text-stone-900 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:border-stone-700 disabled:bg-stone-700 disabled:text-stone-400"
        >
          Új verzió publikálása
        </button>
      </div>

      {state ? (
        <p
          className={`mt-2 text-sm ${state.kind === "success" ? "text-green-500" : "text-red-500"}`}
        >
          {state.text}
        </p>
      ) : null}
    </form>
  );
}
