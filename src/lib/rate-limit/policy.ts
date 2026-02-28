import type { NextRequest } from "next/server";

export type EndpointType =
  | "auth"
  | "admin"
  | "write"
  | "heavy-read"
  | "read";

export type RateWindowPolicy = {
  limit: number;
  windowMs: number;
};

export type EndpointPolicy = {
  burst: RateWindowPolicy;
  sustained: RateWindowPolicy;
};

export const RATE_LIMIT_POLICY: Record<EndpointType, EndpointPolicy> = {
  auth: {
    burst: { limit: 10, windowMs: 10_000 },
    sustained: { limit: 60, windowMs: 5 * 60_000 },
  },
  admin: {
    burst: { limit: 8, windowMs: 10_000 },
    sustained: { limit: 80, windowMs: 5 * 60_000 },
  },
  write: {
    burst: { limit: 15, windowMs: 10_000 },
    sustained: { limit: 120, windowMs: 5 * 60_000 },
  },
  "heavy-read": {
    burst: { limit: 20, windowMs: 10_000 },
    sustained: { limit: 180, windowMs: 5 * 60_000 },
  },
  read: {
    burst: { limit: 40, windowMs: 10_000 },
    sustained: { limit: 300, windowMs: 5 * 60_000 },
  },
};

const HEAVY_READ_PATHS = [
  "/api/markets",
  "/api/events",
  "/api/markets/",
  "/api/events/",
];

function isHeavyRead(pathname: string, method: string) {
  if (method !== "GET" && method !== "POST") {
    return false;
  }

  if (
    pathname.endsWith("/quote") ||
    pathname.endsWith("/quote-sell") ||
    pathname.endsWith("/stats")
  ) {
    return true;
  }

  if (method === "GET") {
    return (
      pathname === "/api/markets" ||
      pathname === "/api/events" ||
      pathname.startsWith("/api/events/")
    );
  }

  return false;
}

export function classifyEndpointType(
  pathname: string,
  method: string,
): EndpointType {
  if (pathname.startsWith("/api/auth")) {
    return "auth";
  }

  if (pathname.startsWith("/api/admin")) {
    return "admin";
  }

  if (isHeavyRead(pathname, method)) {
    return "heavy-read";
  }

  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    return "write";
  }

  if (HEAVY_READ_PATHS.some((path) => pathname.startsWith(path))) {
    return "read";
  }

  return "read";
}

export function rateLimitIdentity(
  req: NextRequest,
  tokenSub?: string,
): {
  ip: string;
  userId: string;
} {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userId = tokenSub ?? "anonymous";

  return { ip, userId };
}
