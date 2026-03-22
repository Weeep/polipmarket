import { TrackedPagePlatform, TrackedPageStatus } from "@prisma/client";

export { TrackedPagePlatform, TrackedPageStatus };

export type TrackedPageRecord = {
  id: string;
  slug: string;
  displayName: string;
  platform: TrackedPagePlatform;
  sourceUrl: string;
  canonicalUrl: string | null;
  status: TrackedPageStatus;
  scrapeEnabled: boolean;
  loginRequired: boolean;
  country: string | null;
  party: string | null;
  role: string | null;
  tags: string[];
  scrapeNotes: string | null;
  lastVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
