import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TrackedPageStatus } from "../domain/TrackedPage";
import {
  CreateTrackedPageInput,
  getDefaultTrackedPagePlatform,
  normalizeOptionalText,
  normalizeTags,
  normalizeTrackedPageUrl,
  slugifyTrackedPageName,
} from "../application/trackedPageInput";

export class TrackedPageRepository {
  async findAll() {
    return prisma.trackedPage.findMany({
      orderBy: [{ status: "asc" }, { displayName: "asc" }],
    });
  }

  async create(input: CreateTrackedPageInput) {
    const slugBase = slugifyTrackedPageName(input.displayName);

    if (!slugBase) {
      throw new Error("Nem sikerült slugot képezni a megjelenítési névből.");
    }

    const slug = await this.ensureUniqueSlug(slugBase);
    const sourceUrl = normalizeTrackedPageUrl(input.sourceUrl);
    const canonicalUrl = normalizeOptionalText(input.canonicalUrl)
      ? normalizeTrackedPageUrl(input.canonicalUrl!)
      : null;

    return prisma.trackedPage.create({
      data: {
        slug,
        displayName: input.displayName.trim(),
        platform: getDefaultTrackedPagePlatform(),
        sourceUrl,
        canonicalUrl,
        status: input.status ?? TrackedPageStatus.ACTIVE,
        scrapeEnabled: input.scrapeEnabled ?? true,
        loginRequired: true,
        country: normalizeOptionalText(input.country)?.toUpperCase() ?? null,
        party: normalizeOptionalText(input.party),
        role: normalizeOptionalText(input.role),
        tags: normalizeTags(input.tags ?? []),
        scrapeNotes: normalizeOptionalText(input.scrapeNotes),
        lastVerifiedAt: input.lastVerifiedAt ?? null,
      },
    });
  }

  async updateStatus(id: string, status: TrackedPageStatus) {
    return prisma.trackedPage.update({
      where: { id },
      data: { status },
    });
  }

  private async ensureUniqueSlug(baseSlug: string) {
    let candidate = baseSlug;
    let suffix = 2;

    while (await prisma.trackedPage.findUnique({ where: { slug: candidate } })) {
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  isKnownUniqueConstraintError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    );
  }
}

export const trackedPageRepository = new TrackedPageRepository();
