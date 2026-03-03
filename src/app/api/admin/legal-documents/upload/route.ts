import { NextResponse } from "next/server";
import { ensureAdmin } from "@/modules/auth/application/ensureAdmin";
import {
  publishLegalDocumentVersion,
  type PublishLegalDocumentVersionInput,
} from "@/modules/legal/application/publishLegalDocumentVersion";
import type { LegalDocumentType } from "@/modules/legal/domain/LegalDocument";

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

async function parseUploadInput(req: Request): Promise<PublishLegalDocumentVersionInput> {
  const form = await req.formData();
  const documentType = parseDocumentType(form.get("documentType"));
  const version = form.get("version");
  const effectiveFrom = parseEffectiveFrom(form.get("effectiveFrom"));
  const file = form.get("document");

  if (typeof version !== "string") {
    throw new Error("A verzió megadása kötelező.");
  }

  if (!(file instanceof File)) {
    throw new Error("A dokumentum feltöltése kötelező.");
  }

  if (file.size === 0) {
    throw new Error("A feltöltött fájl üres.");
  }

  const fileBytes = new Uint8Array(await file.arrayBuffer());

  return {
    documentType,
    version,
    effectiveFrom,
    sourceFileName: file.name,
    fileBytes,
  };
}

export async function POST(req: Request) {
  await ensureAdmin();

  try {
    const input = await parseUploadInput(req);
    await publishLegalDocumentVersion(input);

    return NextResponse.redirect(new URL("/king?legalUpload=success", req.url), 303);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "A jogi dokumentum publikálása sikertelen.";

    const url = new URL("/king", req.url);
    url.searchParams.set("legalUpload", "error");
    url.searchParams.set("message", message);

    return NextResponse.redirect(url, 303);
  }
}
