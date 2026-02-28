import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkRateLimit } from "@/lib/rate-limit/limiter";
import {
  classifyEndpointType,
  rateLimitIdentity,
} from "@/lib/rate-limit/policy";

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

export async function middleware(req: NextRequest) {
  const endpointType = classifyEndpointType(req.nextUrl.pathname, req.method);
  const tokenSub = await getTokenSub(req);
  const { ip, userId } = rateLimitIdentity(req, tokenSub);
  const decision = checkRateLimit({ ip, userId, endpointType });

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
}

export const config = {
  matcher: ["/api/:path*"],
};
