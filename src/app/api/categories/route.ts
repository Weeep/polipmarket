import { NextResponse } from "next/server";

const CATEGORIES = [
  { value: "POLITICS", slug: "politics", label: "Politics", isActive: true },
  { value: "SPORT", slug: "sport", label: "Sport", isActive: true },
  { value: "WORLD", slug: "world", label: "World", isActive: true },
  { value: "OTHER", slug: "other", label: "Other", isActive: true },
] as const;

export async function GET() {
  return NextResponse.json(CATEGORIES.filter((category) => category.isActive));
}
