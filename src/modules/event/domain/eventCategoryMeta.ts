import type { EventCategory } from "./Event";

export type EventCategoryOption = {
  value: EventCategory;
  slug: string;
  label: string;
  badgeClassName: string;
};

export const EVENT_CATEGORY_OPTIONS: EventCategoryOption[] = [
  {
    value: "POLITICS",
    slug: "politics",
    label: "Politika",
    badgeClassName: "bg-amber-500/20 text-amber-200 border border-amber-400/40",
  },
  {
    value: "SPORT",
    slug: "sport",
    label: "Sport",
    badgeClassName: "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40",
  },
  {
    value: "WORLD",
    slug: "world",
    label: "Világ",
    badgeClassName: "bg-sky-500/20 text-sky-200 border border-sky-400/40",
  },
  {
    value: "OTHER",
    slug: "other",
    label: "Egyéb",
    badgeClassName: "bg-stone-500/30 text-stone-200 border border-stone-300/40",
  },
];

export function getCategoryByValue(category?: string | null): EventCategoryOption {
  return (
    EVENT_CATEGORY_OPTIONS.find((option) => option.value === category) ??
    EVENT_CATEGORY_OPTIONS.find((option) => option.value === "OTHER")!
  );
}

export function parseCategoryParam(rawValue: string | null): EventCategory | null {
  if (!rawValue) {
    return null;
  }

  const normalized = rawValue.trim().toLowerCase();
  const bySlug = EVENT_CATEGORY_OPTIONS.find((option) => option.slug === normalized);
  if (bySlug) {
    return bySlug.value;
  }

  const byValue = EVENT_CATEGORY_OPTIONS.find(
    (option) => option.value === rawValue.trim().toUpperCase(),
  );

  return byValue?.value ?? null;
}
