import { RATE_LIMIT_POLICY, type EndpointType, type EndpointPolicy } from "./policy";

export type RateLimitDecision = {
  allowed: boolean;
  endpointType: EndpointType;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAtUnixSeconds: number;
};

type WindowState = {
  count: number;
  expiresAt: number;
};

const windowStore = new Map<string, WindowState>();

function evaluateWindow(
  key: string,
  policy: { limit: number; windowMs: number },
  now: number,
) {
  const existing = windowStore.get(key);

  if (!existing || existing.expiresAt <= now) {
    const expiresAt = now + policy.windowMs;
    windowStore.set(key, { count: 1, expiresAt });

    return {
      exceeded: false,
      remaining: Math.max(policy.limit - 1, 0),
      retryAfterSeconds: Math.ceil(policy.windowMs / 1000),
      resetAtUnixSeconds: Math.ceil(expiresAt / 1000),
    };
  }

  if (existing.count >= policy.limit) {
    return {
      exceeded: true,
      remaining: 0,
      retryAfterSeconds: Math.max(Math.ceil((existing.expiresAt - now) / 1000), 1),
      resetAtUnixSeconds: Math.ceil(existing.expiresAt / 1000),
    };
  }

  existing.count += 1;

  return {
    exceeded: false,
    remaining: Math.max(policy.limit - existing.count, 0),
    retryAfterSeconds: Math.max(Math.ceil((existing.expiresAt - now) / 1000), 1),
    resetAtUnixSeconds: Math.ceil(existing.expiresAt / 1000),
  };
}

export function checkRateLimit(params: {
  ip: string;
  userId: string;
  endpointType: EndpointType;
  now?: number;
  policy?: EndpointPolicy;
}): RateLimitDecision {
  const now = params.now ?? Date.now();
  const policy = params.policy ?? RATE_LIMIT_POLICY[params.endpointType];

  const baseKey = `${params.endpointType}:${params.ip}:${params.userId}`;
  const burst = evaluateWindow(`${baseKey}:burst`, policy.burst, now);

  if (burst.exceeded) {
    return {
      allowed: false,
      endpointType: params.endpointType,
      limit: policy.burst.limit,
      remaining: burst.remaining,
      retryAfterSeconds: burst.retryAfterSeconds,
      resetAtUnixSeconds: burst.resetAtUnixSeconds,
    };
  }

  const sustained = evaluateWindow(`${baseKey}:sustained`, policy.sustained, now);

  if (sustained.exceeded) {
    return {
      allowed: false,
      endpointType: params.endpointType,
      limit: policy.sustained.limit,
      remaining: sustained.remaining,
      retryAfterSeconds: sustained.retryAfterSeconds,
      resetAtUnixSeconds: sustained.resetAtUnixSeconds,
    };
  }

  return {
    allowed: true,
    endpointType: params.endpointType,
    limit: Math.min(policy.burst.limit, policy.sustained.limit),
    remaining: Math.min(burst.remaining, sustained.remaining),
    retryAfterSeconds: Math.min(burst.retryAfterSeconds, sustained.retryAfterSeconds),
    resetAtUnixSeconds: Math.min(
      burst.resetAtUnixSeconds,
      sustained.resetAtUnixSeconds,
    ),
  };
}

export function __clearRateLimitStoreForTests() {
  windowStore.clear();
}
