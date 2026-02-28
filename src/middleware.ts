import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkRateLimit } from "@/lib/rate-limit/limiter";
import {
  classifyEndpointType,
  hashIdentifier,
  rateLimitIdentity,
} from "@/lib/rate-limit/policy";
import {
  logRateLimitDeny,
  recordRateLimitMetric,
} from "@/lib/rate-limit/observability";

function applyRateLimitHeaders(
  res: NextResponse,
  decision: {
    limit: number;
    remaining: number;
    resetAtUnixSeconds: number;
    retryAfterSeconds: number;
    endpointType: string;
  },
) {
  res.headers.set("X-RateLimit-Limit", String(decision.limit));
  res.headers.set("X-RateLimit-Remaining", String(decision.remaining));
  res.headers.set("X-RateLimit-Reset", String(decision.resetAtUnixSeconds));
  res.headers.set("X-RateLimit-Endpoint-Type", decision.endpointType);
  res.headers.set("Retry-After", String(decision.retryAfterSeconds));

  return res;
}

async function getTokenSub(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    return typeof token?.sub === "string" ? token.sub : undefined;
  } catch {
    return undefined;
  }
}

async function enqueueAudit(
  req: NextRequest,
  event: NextFetchEvent,
  payload: {
    endpointType: string;
    path: string;
    method: string;
    ipHash: string;
    userHash: string;
    limit: number;
    retryAfterSeconds: number;
    region: string;
  },
) {
  const token = process.env.RATE_LIMIT_AUDIT_TOKEN;

  if (!token) {
    return;
  }

  event.waitUntil(
    fetch(new URL("/api/internal/rate-limit-deny", req.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-rate-limit-audit-token": token,
      },
      body: JSON.stringify(payload),
    }).catch(() => undefined),
  );
}

export async function middleware(req: NextRequest, event: NextFetchEvent) {
  const startedAt = Date.now();
  const pathname = req.nextUrl.pathname;

  if (pathname === "/api/internal/rate-limit-deny") {
    return NextResponse.next();
  }

  const endpointType = classifyEndpointType(pathname, req.method);
  const tokenSub = await getTokenSub(req);
  const { ip, userId } = rateLimitIdentity(req, tokenSub);
  const decision = checkRateLimit({ ip, userId, endpointType });
  const middlewareLatencyMs = Date.now() - startedAt;

  recordRateLimitMetric({
    endpointType,
    allowed: decision.allowed,
    middlewareLatencyMs,
  });

  if (!decision.allowed) {
    const region =
      req.headers.get("x-vercel-ip-country-region") ??
      req.headers.get("x-vercel-id") ??
      "unknown";
    const denyPayload = {
      endpointType,
      path: pathname,
      method: req.method,
      ipHash: hashIdentifier(ip),
      userHash: hashIdentifier(userId),
      limit: decision.limit,
      retryAfterSeconds: decision.retryAfterSeconds,
      region,
    };

    logRateLimitDeny(denyPayload);
    await enqueueAudit(req, event, denyPayload);

    return applyRateLimitHeaders(
      NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: "Too many requests for this endpoint type",
          endpointType,
        },
        { status: 429 },
      ),
      decision,
    );
  }

  return applyRateLimitHeaders(NextResponse.next(), decision);
}

export const config = {
  matcher: ["/api/:path*"],
};
