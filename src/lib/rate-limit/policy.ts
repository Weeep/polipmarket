import type { NextRequest } from "next/server";
import { isIP } from "node:net";

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
  const ip = resolveClientIp(req);
  const userId = tokenSub ?? "anonymous";

  return { ip, userId };
}

function resolveClientIp(req: NextRequest): string {
  const trustedProxy = req.headers.get("x-trusted-proxy") === "1";

  if (trustedProxy) {
    const realIp = normalizeIp(req.headers.get("x-real-ip"));
    if (realIp) {
      return realIp;
    }

    const forwardedFor = pickFirstValidFromCsv(req.headers.get("x-forwarded-for"));
    if (forwardedFor) {
      return forwardedFor;
    }

    const forwarded = pickForwardedForToken(req.headers.get("forwarded"));
    if (forwarded) {
      return forwarded;
    }
  }

  return "unknown";
}

function pickFirstValidFromCsv(value: string | null): string | null {
  if (!value) {
    return null;
  }

  for (const part of value.split(",")) {
    const normalized = normalizeIp(part);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function pickForwardedForToken(value: string | null): string | null {
  if (!value) {
    return null;
  }

  for (const segment of value.split(",")) {
    for (const token of segment.split(";")) {
      const trimmed = token.trim();
      if (!trimmed.toLowerCase().startsWith("for=")) {
        continue;
      }

      const candidate = trimmed.slice(4).replace(/^"|"$/g, "");
      const normalized = normalizeIp(candidate);
      if (normalized) {
        return normalized;
      }
    }
  }

  return null;
}

function normalizeIp(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  let candidate = value.trim();
  if (!candidate) {
    return null;
  }

  if (candidate.startsWith("[") && candidate.includes("]")) {
    candidate = candidate.slice(1, candidate.indexOf("]"));
  } else if (candidate.includes(":") && candidate.includes(".")) {
    const lastColon = candidate.lastIndexOf(":");
    const maybePort = candidate.slice(lastColon + 1);
    if (/^\d+$/.test(maybePort)) {
      candidate = candidate.slice(0, lastColon);
    }
  }

  if (candidate.toLowerCase().startsWith("::ffff:")) {
    candidate = candidate.slice("::ffff:".length);
  }

  return isIP(candidate) ? candidate : null;
}
