"use client";

import { useSearchParams } from "next/navigation";

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

export function LegalDocumentsAdminForm() {
  const searchParams = useSearchParams();
  const status = searchParams.get("legalUpload");
  const message = searchParams.get("message");
  const state = statusText(status, message);

  return (
    <form
      action="/api/admin/legal-documents/upload"
      method="post"
      encType="multipart/form-data"
      style={{ marginTop: 24, marginBottom: 24 }}
    >
      <h2>Jogi dokumentum verzió feltöltése</h2>
      <p style={{ marginBottom: 12 }}>
        Az új verzió publikálása után az adott dokumentumtípusnál ez lesz az aktuális
        ({"isCurrent"}=true), a korábbi verziók automatikusan lekapcsolódnak.
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
          Dokumentum (PDF)
          <input type="file" name="document" accept="application/pdf" required />
        </label>

        <button type="submit">Új verzió publikálása</button>
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
