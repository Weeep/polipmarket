import { prisma } from "@/lib/prisma";
import { getLegalAcceptanceStatus } from "@/modules/legal/application/getLegalAcceptanceStatus";

export async function acceptCurrentLegalDocuments(userId: string, userAgent?: string | null) {
  const status = await getLegalAcceptanceStatus(userId);

  if (!status.requiresAcceptance) {
    return { ok: true, acceptedCount: 0 };
  }

  const docsToAccept = status.pendingDocumentTypes
    .map((type) => status.currentDocuments[type])
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  await prisma.$transaction(async (tx) => {
    for (const doc of docsToAccept) {
      await tx.userLegalAcceptance.upsert({
        where: {
          userId_documentVersionId: {
            userId,
            documentVersionId: doc.id,
          },
        },
        update: {},
        create: {
          userId,
          documentVersionId: doc.id,
          source: "LEGAL_GATE",
          userAgent: userAgent ?? null,
        },
      });
    }
  });

  return { ok: true, acceptedCount: docsToAccept.length };
}
