import { NextResponse } from "next/server";
import { ensureAdmin } from "@/modules/auth/application/ensureAdmin";
import { getRateLimitMetricSnapshot } from "@/lib/rate-limit/observability";

export async function GET() {
  await ensureAdmin();

  return NextResponse.json(getRateLimitMetricSnapshot());
}
