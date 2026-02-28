import { withAuth } from "next-auth/middleware";
import type { NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit/limiter";
import { classifyEndpointType, rateLimitIdentity } from "@/lib/rate-limit/policy";

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

function rateLimit(req: NextRequestWithAuth) {
  const { ip, userId } = rateLimitIdentity(req);
  const endpointType = classifyEndpointType(req.nextUrl.pathname, req.method);
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

  return { decision };
}

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;

    if (pathname.startsWith("/api")) {
      const result = rateLimit(req);

      if (result instanceof NextResponse) {
        return result;
      }

      const response = NextResponse.next();
      return applyRateLimitHeaders(response, result.decision);
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/about",
    },
  },
);

export const config = {
  matcher: ["/", "/markets/new", "/api/(.*)"],
};
