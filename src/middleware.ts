import { withAuth } from "next-auth/middleware";
import { NextRequest, NextResponse } from "next/server";

const RATE_LIMIT = 60; // requests
const WINDOW_MS = 60_000; // 1 minute

const rateLimitStore = new Map<string, { count: number; expiresAt: number }>();

function rateLimit(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";

  const userId = (req as any).nextauth?.token?.sub ?? "anonymous";

  const key = `${ip}:${userId}`;
  const now = Date.now();

  const entry = rateLimitStore.get(key);

  if (!entry || entry.expiresAt < now) {
    rateLimitStore.set(key, {
      count: 1,
      expiresAt: now + WINDOW_MS,
    });
    return null;
  }

  if (entry.count >= RATE_LIMIT) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        message: `Max ${RATE_LIMIT} requests per minute`,
      },
      { status: 429 },
    );
  }

  entry.count += 1;
  return null;
}

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;

    // 👉 Rate limit CSAK API route-okra
    if (pathname.startsWith("/api")) {
      const rateLimitResponse = rateLimit(req);
      if (rateLimitResponse) {
        return rateLimitResponse;
      }
    }

    // Page route-ok esetén nincs extra logika,
    // withAuth intézi a redirectet
    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
  },
);

export const config = {
  matcher: [
    // Blocked for unauthenticated users
    "/",
    "/markets/new",

    // API protection + rate limit
    "/api/(.*)",
  ],
};
