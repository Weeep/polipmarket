import { TrackedPagePlatform, TrackedPageStatus } from "../domain/TrackedPage";

export type CreateTrackedPageInput = {
  displayName: string;
  sourceUrl: string;
  canonicalUrl?: string | null;
  country?: string | null;
  party?: string | null;
  role?: string | null;
  tags?: string[];
  scrapeNotes?: string | null;
  status?: TrackedPageStatus;
  scrapeEnabled?: boolean;
  lastVerifiedAt?: Date | null;
};

export function normalizeTrackedPageUrl(value: string) {
  const url = new URL(value.trim());
  url.hash = "";
  url.search = "";
  return url.toString();
}

export function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function normalizeTags(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

export function slugifyTrackedPageName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function buildCreateTrackedPageInput(
  body: Record<string, FormDataEntryValue | null>,
): CreateTrackedPageInput {
  const displayName = String(body.displayName ?? "").trim();
  const sourceUrl = String(body.sourceUrl ?? "").trim();

  if (!displayName) {
    throw new Error("A megjelenítési név kötelező.");
  }

  if (!sourceUrl) {
    throw new Error("A Facebook URL kötelező.");
  }

  const parsedStatus = String(body.status ?? "ACTIVE").trim().toUpperCase();
  const status = Object.values(TrackedPageStatus).includes(parsedStatus as TrackedPageStatus)
    ? (parsedStatus as TrackedPageStatus)
    : TrackedPageStatus.ACTIVE;

  return {
    displayName,
    sourceUrl,
    canonicalUrl: normalizeOptionalText(String(body.canonicalUrl ?? "")),
    country: normalizeOptionalText(String(body.country ?? ""))?.toUpperCase() ?? null,
    party: normalizeOptionalText(String(body.party ?? "")),
    role: normalizeOptionalText(String(body.role ?? "")),
    tags: normalizeTags(String(body.tags ?? "").split(",")),
    scrapeNotes: normalizeOptionalText(String(body.scrapeNotes ?? "")),
    status,
    scrapeEnabled: body.scrapeEnabled === "on",
    lastVerifiedAt: normalizeOptionalText(String(body.lastVerifiedAt ?? ""))
      ? new Date(String(body.lastVerifiedAt))
      : null,
  };
}

export function getDefaultTrackedPagePlatform() {
  return TrackedPagePlatform.FACEBOOK;
}
