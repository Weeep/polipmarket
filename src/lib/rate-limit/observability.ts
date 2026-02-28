import { prisma } from "@/lib/prisma";
import type { EndpointType } from "./policy";

type DenyAuditInput = {
  endpointType: EndpointType;
  path: string;
  method: string;
  ipHash: string;
  userHash: string;
  limit: number;
  retryAfterSeconds: number;
  region: string;
};

type BucketStats = {
  allowed: number;
  denied: number;
  totalMiddlewareLatencyMs: number;
  middlewareSamples: number;
};

const endpointStats = new Map<EndpointType, BucketStats>();
let totalAllowed = 0;
let totalDenied = 0;

function getBucket(type: EndpointType): BucketStats {
  const existing = endpointStats.get(type);
  if (existing) return existing;

  const initial: BucketStats = {
    allowed: 0,
    denied: 0,
    totalMiddlewareLatencyMs: 0,
    middlewareSamples: 0,
  };

  endpointStats.set(type, initial);
  return initial;
}

export function recordRateLimitMetric(input: {
  endpointType: EndpointType;
  allowed: boolean;
  middlewareLatencyMs: number;
}) {
  const bucket = getBucket(input.endpointType);

  if (input.allowed) {
    totalAllowed += 1;
    bucket.allowed += 1;
  } else {
    totalDenied += 1;
    bucket.denied += 1;
  }

  bucket.middlewareSamples += 1;
  bucket.totalMiddlewareLatencyMs += input.middlewareLatencyMs;
}

export function getRateLimitMetricSnapshot() {
  const total = totalAllowed + totalDenied;
  const blockedRatio = total > 0 ? totalDenied / total : 0;

  const endpointBreakdown = Array.from(endpointStats.entries()).map(
    ([endpointType, stats]) => ({
      endpointType,
      ...stats,
      blockedRatio:
        stats.allowed + stats.denied > 0
          ? stats.denied / (stats.allowed + stats.denied)
          : 0,
      averageMiddlewareLatencyMs:
        stats.middlewareSamples > 0
          ? stats.totalMiddlewareLatencyMs / stats.middlewareSamples
          : 0,
    }),
  );

  endpointBreakdown.sort((a, b) => b.denied - a.denied);

  return {
    totals: {
      allowed: totalAllowed,
      denied: totalDenied,
      blockedRatio,
    },
    topAbusedEndpoints: endpointBreakdown.slice(0, 5),
    endpointBreakdown,
  };
}

export async function persistRateLimitDenyAudit(input: DenyAuditInput) {
  await prisma.rateLimitDenyAudit.create({
    data: input,
  });
}

export function logRateLimitDeny(input: DenyAuditInput) {
  console.warn("[RATE_LIMIT_DENY]", JSON.stringify(input));
}
