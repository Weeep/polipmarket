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
    <form
      action="/api/admin/legal-documents/upload"
      method="post"
      style={{ marginTop: 24, marginBottom: 24 }}
    >
      <h2>Jogi dokumentum verzió publikálása</h2>
      <p style={{ marginBottom: 12 }}>
        Feltöltés helyett a <code>public/assets</code> mappában lévő PDF-ek közül
        választasz. Az új verzió publikálása után az adott dokumentumtípusnál ez lesz
        az aktuális ({"isCurrent"}=true), a korábbi verziók automatikusan
        lekapcsolódnak.
      </p>

      <div style={{ display: "grid", gap: 8, maxWidth: 560 }}>
        <label>
          Dokumentumtípus
          <select name="documentType" defaultValue="TERMS_OF_SERVICE" required>
            <option value="TERMS_OF_SERVICE">ÁSZF</option>
            <option value="PRIVACY_NOTICE">Adatkezelési tájékoztató</option>
          </select>
        </label>

        <label>
          Verzió
          <input
            name="version"
            placeholder="pl. 2026-03-03-v2"
            required
            maxLength={120}
          />
        </label>

        <label>
          Hatálybalépés dátuma
          <input type="date" name="effectiveFrom" required />
        </label>

        <label>
          Dokumentum a public/assets könyvtárból
          <select
            name="assetFileName"
            required
            defaultValue={availableDocuments[0] ?? ""}
            disabled={availableDocuments.length === 0}
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

        <button type="submit" disabled={availableDocuments.length === 0}>
          Új verzió publikálása
        </button>
      </div>

      {state ? (
        <p
          style={{
            marginTop: 12,
            color: state.kind === "success" ? "#16a34a" : "#dc2626",
          }}
        >
          {state.text}
        </p>
      ) : null}
    </form>
  );
}
