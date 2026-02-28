import type { EndpointType } from "./policy";

export type RateLimitAuditPayload = {
  eventType: "DECISION" | "BACKEND_ERROR";
  endpointType: EndpointType;
  path: string;
  method: string;
  region?: string;
  ip: string;
  userId: string;
  allowed?: boolean;
  quotaLimit?: number;
  remaining?: number;
  retryAfterSeconds?: number;
  resetAtUnixSeconds?: number;
  decisionLatencyMs?: number;
  errorMessage?: string;
};

export function resolveRequestRegion(headers: Headers): string {
  return (
    headers.get("x-vercel-ip-country") ??
    headers.get("cf-ipcountry") ??
    headers.get("x-region") ??
    "unknown"
  );
}
