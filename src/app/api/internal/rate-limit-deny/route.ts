import { NextResponse } from "next/server";
import {
  persistRateLimitDenyAudit,
} from "@/lib/rate-limit/observability";
import type { EndpointType } from "@/lib/rate-limit/policy";

type Body = {
  endpointType: EndpointType;
  path: string;
  method: string;
  ipHash: string;
  userHash: string;
  limit: number;
  retryAfterSeconds: number;
  region: string;
};

export async function POST(req: Request) {
  const expected = process.env.RATE_LIMIT_AUDIT_TOKEN;
  const provided = req.headers.get("x-rate-limit-audit-token");

  if (!expected || !provided || provided !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as Body;

    await persistRateLimitDenyAudit(body);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
