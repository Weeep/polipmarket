import { redirect } from "next/navigation";
import { getSession } from "@/modules/auth/application/getSession";
import { getLegalAcceptanceStatus } from "@/modules/legal/application/getLegalAcceptanceStatus";
import LegalAcceptClient from "@/components/LegalAcceptClient";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default async function LegalAcceptPage() {
  const session = await getSession();

  if (!session?.user?.id) {
    redirect("/about");
  }

  const status = await getLegalAcceptanceStatus(session.user.id);

  const terms = status.currentDocuments.TERMS_OF_SERVICE;
  const privacy = status.currentDocuments.PRIVACY_NOTICE;

  if (!terms || !privacy) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-6 py-10 text-stone-100">
        <h1 className="text-2xl font-bold">
          Jogi dokumentumok jelenleg nem elérhetők
        </h1>
        <p className="text-sm text-stone-300">
          Az admin még nem publikálta mindkét kötelező dokumentum aktuális
          verzióját.
        </p>
      </main>
    );
  }

  if (!status.requiresAcceptance) {
    redirect("/");
  }

  return (
    <LegalAcceptClient
      terms={{
        documentType: terms.documentType,
        version: terms.version,
        effectiveFrom: formatDate(terms.effectiveFrom),
        sourceFileName: terms.sourceFileName,
      }}
      privacy={{
        documentType: privacy.documentType,
        version: privacy.version,
        effectiveFrom: formatDate(privacy.effectiveFrom),
        sourceFileName: privacy.sourceFileName,
      }}
    />
  );
}
