import { prisma } from "@/lib/prisma";
import type { LegalDocumentType, LegalDocumentVersion } from "@/modules/legal/domain/LegalDocument";

type LegalGateState = {
  requiresAcceptance: boolean;
  currentDocuments: Partial<Record<LegalDocumentType, LegalDocumentVersion>>;
  pendingDocumentTypes: LegalDocumentType[];
};

const REQUIRED_TYPES: LegalDocumentType[] = ["TERMS_OF_SERVICE", "PRIVACY_NOTICE"];

export async function getLegalAcceptanceStatus(userId: string): Promise<LegalGateState> {
  const currentVersions = await prisma.legalDocumentVersion.findMany({
    where: {
      isCurrent: true,
      documentType: {
        in: REQUIRED_TYPES,
      },
    },
    orderBy: { publishedAt: "desc" },
  });

  const currentDocuments: Partial<Record<LegalDocumentType, LegalDocumentVersion>> = {};

  for (const doc of currentVersions) {
    if (!currentDocuments[doc.documentType]) {
      currentDocuments[doc.documentType] = doc;
    }
  }

  const hasAllCurrentRequired = REQUIRED_TYPES.every((type) => Boolean(currentDocuments[type]));

  if (!hasAllCurrentRequired) {
    return {
      requiresAcceptance: false,
      currentDocuments,
      pendingDocumentTypes: [],
    };
  }

  const currentDocumentIds = REQUIRED_TYPES.map((type) => currentDocuments[type]!.id);

  const acceptedRows = await prisma.userLegalAcceptance.findMany({
    where: {
      userId,
      documentVersionId: {
        in: currentDocumentIds,
      },
    },
    select: {
      documentVersionId: true,
    },
  });

  const acceptedIds = new Set(acceptedRows.map((row) => row.documentVersionId));
  const pendingDocumentTypes = REQUIRED_TYPES.filter(
    (type) => !acceptedIds.has(currentDocuments[type]!.id),
  );

  return {
    requiresAcceptance: pendingDocumentTypes.length > 0,
    currentDocuments,
    pendingDocumentTypes,
  };
}
