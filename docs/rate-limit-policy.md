# Rate limit policy and architecture

This document defines the endpoint policy buckets, trusted client-IP extraction, observability, and middleware integration used by the application.

## 1) Requirements & policy definition

Identity keys for limits:
- IP (trusted header normalization rules below)
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
  - trusted IP normalization and spoofing guard
  - identity extraction
  - per-bucket policy table
- `limiter.ts`
  - in-memory evaluator
  - dual-window check (burst + sustained)
  - standard decision object for middleware
- `observability.ts`
  - in-memory metrics snapshot for blocked-ratio / top-abused endpoints
  - structured deny logging helper
  - persistence helper for deny audit records

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
4. Record in-memory metrics (allowed/denied + middleware latency).
5. If blocked, emit structured deny log and asynchronously persist audit row via internal endpoint.
6. If blocked, return `429` JSON with headers.
7. If allowed, continue with `NextResponse.next()` and include standard rate-limit headers.

Response headers:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
- `X-RateLimit-Endpoint-Type`
- `Retry-After`

## 5) Proxy/IP trust and spoofing guard

### Header trust order
The middleware uses this trust order for client IP:
1. `x-vercel-forwarded-for` (Vercel-specific)
2. `x-real-ip`
3. `x-forwarded-for` chain (first client hop)

### Spoofing guard
When `x-forwarded-for` is used, the chain is normalized and rejected if:
- empty/invalid entries only
- chain length exceeds 5 hops (`MAX_XFF_ENTRIES`)

Invalid/uncertain source falls back to `unknown`.

### Hosting notes
- On Vercel: prefer `x-vercel-forwarded-for`.
- On reverse-proxy/self-host: ensure your proxy sets `x-real-ip` or controlled `x-forwarded-for` and strips untrusted inbound copies.

## 7) Observability and incident response

### Structured deny logging
On each deny, middleware logs:
- endpoint type
- hashed IP/user identifiers
- quota limit
- region hint
- path/method
- retry-after

### Metrics
In-memory snapshot tracks:
- total allowed/denied and blocked ratio
- top abused endpoints (highest denied)
- average middleware latency per endpoint type

Admin endpoint:
- `GET /api/admin/rate-limit/metrics`

### Audit persistence
Denied requests are asynchronously persisted into DB table:
- `RateLimitDenyAudit`

Internal ingestion endpoint:
- `POST /api/internal/rate-limit-deny`
- requires `x-rate-limit-audit-token` matching `RATE_LIMIT_AUDIT_TOKEN`

## Environment

Recommended env vars for production:
- `NEXTAUTH_SECRET`
- `RATE_LIMIT_AUDIT_TOKEN`

## Notes

This implementation remains instance-local for the limiter state (in-memory windows). For horizontally scaled or serverless deployments, the evaluator backend should be replaced with a distributed store (e.g. Redis) while reusing the same policy/classification layer.
