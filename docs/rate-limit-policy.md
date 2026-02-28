# Rate limit policy and architecture

This document defines the endpoint policy buckets and middleware integration used by the application.

## 1) Requirements & policy definition

Identity keys for limits:
- IP (trusted-proxy headers only, normalized)
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

## 2) Trusted proxy / IP source strategy (AWS Lightsail + Nginx)

Production runs behind Nginx on Lightsail, so the application **only trusts IP headers if the request is marked as proxy-trusted**.

`rateLimitIdentity` works as follows:
1. Require `x-trusted-proxy: 1`.
2. Preferred source: `x-real-ip`.
3. Fallbacks: `x-forwarded-for` first valid element, then `forwarded` (`for=` token).
4. All values are normalized and validated with runtime-safe IPv4/IPv6 checks (Edge-compatible) before use.
5. If no trusted/valid source exists, IP becomes `unknown`.

Normalization/guard behavior:
- Trims whitespace.
- Accepts IPv4 and IPv6.
- Strips optional port (`1.2.3.4:1234`, `[2001:db8::1]:443`).
- Converts IPv4-mapped IPv6 (`::ffff:1.2.3.4`) to IPv4.
- Rejects malformed values.

This prevents direct spoofing where the client injects `x-forwarded-for` and the app blindly trusts it.

### Nginx config requirements (Lightsail)

In the reverse-proxy `location` that forwards to Next.js, set headers explicitly so user-supplied values are overwritten:

```nginx
location / {
    proxy_pass http://127.0.0.1:3382;

    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;

    # Security: define trusted proxy boundary for app-level IP extraction
    proxy_set_header X-Trusted-Proxy 1;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $remote_addr;
}
```

Typical file locations on Ubuntu Lightsail:
- `/etc/nginx/sites-available/<site>.conf`
- symlink: `/etc/nginx/sites-enabled/<site>.conf`

After editing:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

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

## 5) Observability and incident response

Rate-limit middleware now emits audit events to `POST /api/internal/rate-limit-audit` only for denied decisions and backend errors.

- Stored fields include: `endpointType`, `ipHash`, `userHash`, `quotaLimit`, `region`, decision outcome and retry/reset values.
- Identifiers are hashed server-side before persistence in `RateLimitAuditEvent`.
- Event types:
  - `DECISION` for deny outcomes.
  - `BACKEND_ERROR` for limiter backend errors (future Redis migration compatibility).
- The ingest endpoint hard-drops `DECISION` events unless `allowed === false` (defense-in-depth if any caller accidentally submits allow events).

Structured metrics logging is computed from the audit table (rolling 15-minute window):
- blocking rate
- top abused endpoint types
- p95 rate-limit decision latency

Structured alert logs are emitted when:
- 429/deny rate spikes (latest 5 minutes compared to previous 5 minutes)
- backend error events are present in the latest 5-minute window

Required environment variables:
- `RATE_LIMIT_AUDIT_TOKEN`: shared secret between middleware and audit endpoint. If missing, middleware skips audit delivery and logs a structured `config-missing` warning.
- `RATE_LIMIT_AUDIT_SALT`: required salt used for SHA-256 hashing of IP/user identifiers. Ingest returns `500` if missing (no insecure fallback).

Troubleshooting when rows are not inserted:
- verify migration was applied (`RateLimitAuditEvent` exists),
- verify both required env vars are set in the running process,
- check logs for `rate-limit-audit` events (`config-missing`, `ingest-failed`, `delivery-error`).
