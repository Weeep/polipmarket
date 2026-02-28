# Rate limit policy and architecture

This document defines the endpoint policy buckets and middleware integration used by the application.

## 1) Requirements & policy definition

Identity keys for limits:
- IP (`x-forwarded-for` first hop, trimmed)
- User (`nextauth.token.sub` or `anonymous`)
- Endpoint type bucket

Composite identity: `endpointType:ip:userId`.

Policy buckets:
- `auth`: `/api/auth/*`
- `admin`: `/api/admin/*`
- `write`: non-GET/HEAD/OPTIONS state-changing endpoints
- `heavy-read`: quote/stats and high-cost list endpoints
- `read`: default safe reads

Every bucket uses two windows:
- Burst window (short interval)
- Sustained window (long interval)

Current values are implemented in `src/lib/rate-limit/policy.ts`.

## 3) Rate-limit architecture

The rate-limit layer is split into:
- `policy.ts`
  - endpoint classification
  - identity extraction
  - per-bucket policy table
- `limiter.ts`
  - in-memory evaluator
  - dual-window check (burst + sustained)
  - standard decision object for middleware

Decision output includes:
- allow/deny
- effective limit
- remaining requests
- reset timestamp
- retry-after seconds

## 4) Middleware integration plan

`src/middleware.ts` calls the rate-limit layer for every `/api/*` request.

Flow:
1. Read identity (IP + user).
2. Classify endpoint type.
3. Evaluate burst and sustained windows.
4. If blocked, return `429` JSON with headers.
5. If allowed, continue with `NextResponse.next()` and include standard rate-limit headers.

Response headers:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
- `X-RateLimit-Endpoint-Type`
- `Retry-After`

## Notes

This implementation remains instance-local (in-memory). For horizontally scaled or serverless deployments, the evaluator backend should be replaced with a distributed store (e.g. Redis) while reusing the same policy/classification layer.
