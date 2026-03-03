import { NextResponse } from "next/server";
import { ensureAdmin } from "@/modules/auth/application/ensureAdmin";
import {
  publishLegalDocumentVersion,
  type PublishLegalDocumentVersionInput,
} from "@/modules/legal/application/publishLegalDocumentVersion";
import { readPublicAssetPdf } from "@/modules/legal/application/publicLegalAssets";
import type { LegalDocumentType } from "@/modules/legal/domain/LegalDocument";

function redirectToKing(searchParams: URLSearchParams): NextResponse {
  const location = `/king?${searchParams.toString()}`;

  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: location,
    },
  });
}

function parseDocumentType(value: FormDataEntryValue | null): LegalDocumentType {
  if (value !== "TERMS_OF_SERVICE" && value !== "PRIVACY_NOTICE") {
    throw new Error("Érvénytelen dokumentumtípus.");
  }

  return value;
}

function parseEffectiveFrom(value: FormDataEntryValue | null): Date {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("A hatálybalépés dátuma kötelező.");
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Érvénytelen hatálybalépés dátum.");
  }

  return parsed;
}

function parseAssetFileName(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("A dokumentum kiválasztása kötelező.");
  }

  return value;
}

async function parseUploadInput(req: Request): Promise<PublishLegalDocumentVersionInput> {
  const form = await req.formData();
  const documentType = parseDocumentType(form.get("documentType"));
  const version = form.get("version");
  const effectiveFrom = parseEffectiveFrom(form.get("effectiveFrom"));
  const assetFileName = parseAssetFileName(form.get("assetFileName"));

  if (typeof version !== "string") {
    throw new Error("A verzió megadása kötelező.");
  }

  const fileBytes = await readPublicAssetPdf(assetFileName);

  return {
    documentType,
    version,
    effectiveFrom,
    sourceFileName: assetFileName,
    fileBytes,
  };
}

export async function POST(req: Request) {
  await ensureAdmin();

  try {
    const input = await parseUploadInput(req);
    await publishLegalDocumentVersion(input);

    return redirectToKing(new URLSearchParams({ legalUpload: "success" }));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "A jogi dokumentum publikálása sikertelen.";

    return redirectToKing(
      new URLSearchParams({
        legalUpload: "error",
        message,
      }),
    );
  }
}
