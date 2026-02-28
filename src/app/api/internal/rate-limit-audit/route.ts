import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { RateLimitAuditPayload } from "@/lib/rate-limit/observability";

const ALERT_WINDOW_MINUTES = 5;
const SPIKE_MIN_DENIES = 20;
const SPIKE_MULTIPLIER = 2;

function hashIdentifier(value: string, secret: string): string {
  return createHash("sha256").update(`${secret}:${value}`).digest("hex");
}

function isValidPayload(payload: unknown): payload is RateLimitAuditPayload {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Record<string, unknown>;
  return (
    (candidate.eventType === "DECISION" || candidate.eventType === "BACKEND_ERROR") &&
    typeof candidate.endpointType === "string" &&
    typeof candidate.path === "string" &&
    typeof candidate.method === "string" &&
    typeof candidate.ip === "string" &&
    typeof candidate.userId === "string"
  );
}

async function emitAlerts() {
  const now = new Date();
  const recentWindowStart = new Date(now.getTime() - ALERT_WINDOW_MINUTES * 60_000);
  const previousWindowStart = new Date(now.getTime() - ALERT_WINDOW_MINUTES * 2 * 60_000);

  const [recentDenied, previousDenied, recentBackendErrors] = await Promise.all([
    prisma.rateLimitAuditEvent.count({
      where: {
        eventType: "DECISION",
        allowed: false,
        createdAt: { gte: recentWindowStart },
      },
    }),
    prisma.rateLimitAuditEvent.count({
      where: {
        eventType: "DECISION",
        allowed: false,
        createdAt: { gte: previousWindowStart, lt: recentWindowStart },
      },
    }),
    prisma.rateLimitAuditEvent.count({
      where: {
        eventType: "BACKEND_ERROR",
        createdAt: { gte: recentWindowStart },
      },
    }),
  ]);

  const denominator = Math.max(previousDenied, 1);
  const spikeRatio = recentDenied / denominator;

  if (recentDenied >= SPIKE_MIN_DENIES && spikeRatio >= SPIKE_MULTIPLIER) {
    console.warn(
      JSON.stringify({
        scope: "rate-limit-alert",
        type: "429-spike",
        recentDenied,
        previousDenied,
        spikeRatio,
        windowMinutes: ALERT_WINDOW_MINUTES,
      }),
    );
  }

  if (recentBackendErrors > 0) {
    console.warn(
      JSON.stringify({
        scope: "rate-limit-alert",
        type: "backend-error-rate-increase",
        recentBackendErrors,
        windowMinutes: ALERT_WINDOW_MINUTES,
      }),
    );
  }
}

async function emitMetricsLog() {
  const metricsWindowStart = new Date(Date.now() - 15 * 60_000);

  const [totals, topAbusedEndpoints, latencyRows] = await Promise.all([
    prisma.rateLimitAuditEvent.groupBy({
      by: ["allowed"],
      where: {
        eventType: "DECISION",
        createdAt: { gte: metricsWindowStart },
      },
      _count: { _all: true },
    }),
    prisma.rateLimitAuditEvent.groupBy({
      by: ["endpointType"],
      where: {
        eventType: "DECISION",
        allowed: false,
        createdAt: { gte: metricsWindowStart },
      },
      _count: { _all: true },
      orderBy: { _count: { endpointType: "desc" } },
      take: 3,
    }),
    prisma.rateLimitAuditEvent.findMany({
      where: {
        eventType: "DECISION",
        decisionLatencyMs: { not: null },
        createdAt: { gte: metricsWindowStart },
      },
      select: { decisionLatencyMs: true },
      orderBy: { decisionLatencyMs: "asc" },
    }),
  ]);

  const totalDecisions = totals.reduce(
    (sum: number, row: { _count: { _all: number } }) => sum + row._count._all,
    0,
  );
  const blockedDecisions = totals
    .filter((row: { allowed: boolean | null }) => row.allowed === false)
    .reduce(
      (sum: number, row: { _count: { _all: number } }) => sum + row._count._all,
      0,
    );

  const p95Index = Math.max(Math.ceil(latencyRows.length * 0.95) - 1, 0);
  const p95LatencyMs = latencyRows[p95Index]?.decisionLatencyMs ?? null;

  console.info(
    JSON.stringify({
      scope: "rate-limit-metrics",
      windowMinutes: 15,
      blockingRate: totalDecisions === 0 ? 0 : blockedDecisions / totalDecisions,
      blockedDecisions,
      totalDecisions,
      topAbusedEndpoints: topAbusedEndpoints.map((row: {
        endpointType: string | null;
        _count: { _all: number };
      }) => ({
        endpointType: row.endpointType,
        denied: row._count._all,
      })),
      decisionLatencyP95Ms: p95LatencyMs,
    }),
  );
}

export async function POST(req: Request) {
  const expectedToken = process.env.RATE_LIMIT_AUDIT_TOKEN;
  const auditSalt = process.env.RATE_LIMIT_AUDIT_SALT;

  if (!expectedToken) {
    console.error(
      JSON.stringify({
        scope: "rate-limit-audit",
        type: "config-missing",
        message: "RATE_LIMIT_AUDIT_TOKEN must be configured.",
      }),
    );
    return NextResponse.json(
      { error: "Audit ingest unavailable: missing RATE_LIMIT_AUDIT_TOKEN" },
      { status: 500 },
    );
  }

  if (!auditSalt) {
    console.error(
      JSON.stringify({
        scope: "rate-limit-audit",
        type: "config-missing",
        message: "RATE_LIMIT_AUDIT_SALT must be configured.",
      }),
    );
    return NextResponse.json(
      { error: "Audit ingest unavailable: missing RATE_LIMIT_AUDIT_SALT" },
      { status: 500 },
    );
  }

  if (req.headers.get("x-rate-limit-audit-token") !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const payload = body;

  await prisma.rateLimitAuditEvent.create({
    data: {
      eventType: payload.eventType,
      endpointType: payload.endpointType,
      path: payload.path,
      method: payload.method,
      region: payload.region ?? "unknown",
      ipHash: hashIdentifier(payload.ip, auditSalt),
      userHash: hashIdentifier(payload.userId, auditSalt),
      allowed: payload.allowed,
      quotaLimit: payload.quotaLimit,
      remaining: payload.remaining,
      retryAfterSeconds: payload.retryAfterSeconds,
      resetAtUnixSeconds: payload.resetAtUnixSeconds,
      decisionLatencyMs: payload.decisionLatencyMs,
      errorMessage: payload.errorMessage,
    },
  });

  if (payload.eventType === "BACKEND_ERROR") {
    await emitAlerts();
    return NextResponse.json({ ok: true });
  }

  if (payload.allowed === false) {
    await Promise.all([emitAlerts(), emitMetricsLog()]);
  }

  return NextResponse.json({ ok: true });
}
