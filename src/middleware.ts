import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkRateLimit } from "@/lib/rate-limit/limiter";
import {
  classifyEndpointType,
  rateLimitIdentity,
} from "@/lib/rate-limit/policy";
import {
  resolveRequestRegion,
  type RateLimitAuditPayload,
} from "@/lib/rate-limit/observability";

const globalForRateLimitAudit = globalThis as unknown as {
  rateLimitAuditConfigWarningLogged?: boolean;
};

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

function shouldSkipRateLimit(pathname: string) {
  return pathname === "/api/internal/rate-limit-audit";
}

function getAuditToken(): string | undefined {
  const token = process.env.RATE_LIMIT_AUDIT_TOKEN;

  if (!token && !globalForRateLimitAudit.rateLimitAuditConfigWarningLogged) {
    globalForRateLimitAudit.rateLimitAuditConfigWarningLogged = true;
    console.warn(
      JSON.stringify({
        scope: "rate-limit-audit",
        type: "config-missing",
        message:
          "RATE_LIMIT_AUDIT_TOKEN is not configured, rate-limit audit persistence is disabled.",
      }),
    );
  }

  return token;
}

async function sendRateLimitAuditEvent(req: NextRequest, payload: RateLimitAuditPayload) {
  const token = getAuditToken();

  if (!token) {
    return;
  }

  try {
    const response = await fetch(new URL("/api/internal/rate-limit-audit", req.url), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-rate-limit-audit-token": token,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      console.warn(
        JSON.stringify({
          scope: "rate-limit-audit",
          type: "ingest-failed",
          status: response.status,
          endpointType: payload.endpointType,
          eventType: payload.eventType,
          responseBody: body,
        }),
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "audit-delivery-failed";
    console.warn(
      JSON.stringify({
        scope: "rate-limit-audit",
        type: "delivery-error",
        endpointType: payload.endpointType,
        eventType: payload.eventType,
        errorMessage,
      }),
    );
  }
}

export async function middleware(req: NextRequest, event: NextFetchEvent) {
  if (shouldSkipRateLimit(req.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const endpointType = classifyEndpointType(req.nextUrl.pathname, req.method);
  const tokenSub = await getTokenSub(req);
  const { ip, userId } = rateLimitIdentity(req, tokenSub);
  const region = resolveRequestRegion(req.headers);
  const startedAt = Date.now();

  try {
    const decision = checkRateLimit({ ip, userId, endpointType });
    const decisionLatencyMs = Date.now() - startedAt;

    event.waitUntil(
      sendRateLimitAuditEvent(req, {
        eventType: "DECISION",
        endpointType,
        path: req.nextUrl.pathname,
        method: req.method,
        region,
        ip,
        userId,
        allowed: decision.allowed,
        quotaLimit: decision.limit,
        remaining: decision.remaining,
        retryAfterSeconds: decision.retryAfterSeconds,
        resetAtUnixSeconds: decision.resetAtUnixSeconds,
        decisionLatencyMs,
      }),
    );

    if (!decision.allowed) {
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
  } catch (error) {
    const decisionLatencyMs = Date.now() - startedAt;
    const errorMessage = error instanceof Error ? error.message : "unknown-rate-limit-error";

    event.waitUntil(
      sendRateLimitAuditEvent(req, {
        eventType: "BACKEND_ERROR",
        endpointType,
        path: req.nextUrl.pathname,
        method: req.method,
        region,
        ip,
        userId,
        decisionLatencyMs,
        errorMessage,
      }),
    );

    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/api/:path*"],
};
