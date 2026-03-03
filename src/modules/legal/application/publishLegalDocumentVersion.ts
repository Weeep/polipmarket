import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { LegalDocumentType, LegalDocumentVersion } from "@/modules/legal/domain/LegalDocument";

export type PublishLegalDocumentVersionInput = {
  documentType: LegalDocumentType;
  version: string;
  effectiveFrom: Date;
  sourceFileName: string;
  fileBytes: Uint8Array;
};

function normalizeVersion(version: string) {
  return version.trim();
}

function normalizeFileName(fileName: string) {
  return fileName.trim();
}

export async function publishLegalDocumentVersion(
  input: PublishLegalDocumentVersionInput,
): Promise<LegalDocumentVersion> {
  const version = normalizeVersion(input.version);
  const sourceFileName = normalizeFileName(input.sourceFileName);

  if (!version) {
    throw new Error("A verzió megadása kötelező.");
  }

  if (!sourceFileName) {
    throw new Error("A feltöltött fájlnév hiányzik.");
  }

  if (!input.fileBytes.length) {
    throw new Error("A feltöltött fájl üres.");
  }

  const contentHash = createHash("sha256").update(input.fileBytes).digest("hex");

  return prisma.$transaction(async (tx) => {
    await tx.legalDocumentVersion.updateMany({
      where: {
        documentType: input.documentType,
        isCurrent: true,
      },
      data: {
        isCurrent: false,
      },
    });

    return tx.legalDocumentVersion.create({
      data: {
        documentType: input.documentType,
        version,
        sourceFileName,
        contentHash,
        effectiveFrom: input.effectiveFrom,
        isCurrent: true,
      },
    });
  });
}
