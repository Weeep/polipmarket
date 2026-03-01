import { NextResponse } from "next/server";

const CATEGORIES = [
  { value: "POLITICS", label: "Politics" },
  { value: "SPORT", label: "Sport" },
  { value: "WORLD", label: "World" },
  { value: "OTHER", label: "Other" },
] as const;

export async function GET() {
  return NextResponse.json(CATEGORIES);
}
