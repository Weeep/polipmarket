"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type { MarketStatus } from "@/modules/market/domain/Market";

const MARKET_STATUSES: MarketStatus[] = [
  "PENDING_APPROVAL",
  "OPEN",
  "CLOSED",
  "RESOLVED",
  "CANCELLED",
];

type MarketOutcome = {
  id: string;
  label: string;
  position: number;
  yesPrice?: number;
  noPrice?: number;
};

type MarketEvent = {
  id: string;
  question: string;
  resolveAt?: string | null;
};

type MarketSummary = {
  id: string;
  question: string;
  event?: MarketEvent | null;
  status: MarketStatus;
  bettingCloseAt: string;
  resolvedOutcomeId?: string | null;
  resolvedPosition?: "YES" | "NO" | null;
  outcomes?: MarketOutcome[];
  createdBy: string;
  createdByName?: string | null;
};

type MarketSummaryApi = MarketSummary & { marketId?: string };

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function statusLabel(status: MarketStatus) {
  return MARKET_STATUSES.includes(status) ? status : "UNKNOWN";
}

export function MarketAdminPanel() {
  const [markets, setMarkets] = useState<MarketSummary[]>([]);
  const [selectedPositionByMarket, setSelectedPositionByMarket] = useState<
    Record<string, "YES" | "NO">
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyMarketId, setBusyMarketId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch("/api/markets?include=prices&includePending=true")
      .then((res) => res.json())
      .then((data: MarketSummaryApi[]) => {
        if (cancelled) return;
        setMarkets(
          data
            .map((market) => ({
              ...market,
              id: market.id ?? market.marketId ?? "",
            }))
            .filter((market) => Boolean(market.id)),
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getErrorMessage(err, "Failed to load markets"));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSelectedPositionByMarket((prev) => {
      const next = { ...prev };
      for (const market of markets) {
        if (next[market.id]) continue;
        if (market.resolvedPosition === "YES" || market.resolvedPosition === "NO") {
          next[market.id] = market.resolvedPosition;
          continue;
        }
        next[market.id] = "YES";
      }
      return next;
    });
  }, [markets]);

  const openMarketsToClose = useMemo(() => {
    const now = Date.now();
    return markets.filter(
      (market) =>
        market.status === "OPEN" && new Date(market.bettingCloseAt).getTime() <= now,
    );
  }, [markets]);

  const marketsToApprove = useMemo(
    () => markets.filter((market) => market.status === "PENDING_APPROVAL"),
    [markets],
  );

  const marketsToResolve = useMemo(() => {
    const now = Date.now();
    return markets.filter((market) => {
      if (market.status !== "CLOSED") {
        return false;
      }

      const eventResolveTime = market.event?.resolveAt
        ? new Date(market.event.resolveAt).getTime()
        : Number.POSITIVE_INFINITY;

      return eventResolveTime <= now;
    });
  }, [markets]);

  const activeBettableMarkets = useMemo(() => {
    const now = Date.now();
    return markets.filter(
      (market) =>
        market.status === "OPEN" && new Date(market.bettingCloseAt).getTime() > now,
    );
  }, [markets]);

  const resolvedMarkets = useMemo(
    () => markets.filter((market) => market.status === "RESOLVED"),
    [markets],
  );

  const updateMarket = (updated: MarketSummary) => {
    setMarkets((prev) =>
      prev.map((market) => (market.id === updated.id ? updated : market)),
    );
  };

  const handleApprove = async (marketId: string) => {
    if (!marketId) {
      setActionError("Missing market id for approval.");
      return;
    }

    setActionError(null);
    setBusyMarketId(marketId);
    try {
      const res = await apiFetch(`/api/markets/${marketId}/approve`, {
        method: "POST",
      });
      const updated = (await res.json()) as MarketSummary;
      updateMarket(updated);
    } catch (err) {
      setActionError(getErrorMessage(err, "Failed to approve market"));
    } finally {
      setBusyMarketId(null);
    }
  };

  const handleResolve = async (marketId: string) => {
    if (!marketId) {
      setActionError("Missing market id for resolve.");
      return;
    }

    const market = markets.find((item) => item.id === marketId);
    const outcomeId = market?.resolvedOutcomeId ?? market?.outcomes?.[0]?.id;
    if (!outcomeId) {
      setActionError("No outcome available to resolve.");
      return;
    }
    const position = selectedPositionByMarket[marketId] ?? "YES";

    setActionError(null);
    setBusyMarketId(marketId);
    try {
      const res = await apiFetch(`/api/markets/${marketId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcomeId, position }),
      });
      const updated = (await res.json()) as MarketSummary;
      updateMarket(updated);
    } catch (err) {
      setActionError(getErrorMessage(err, "Failed to resolve market"));
    } finally {
      setBusyMarketId(null);
    }
  };

  const handleRejectOrCancel = async (marketId: string) => {
    if (!marketId) {
      setActionError("Missing market id for reject/cancel.");
      return;
    }
    setActionError(null);
    setBusyMarketId(marketId);
    try {
      const res = await apiFetch(`/api/markets/${marketId}/cancel`, {
        method: "POST",
      });
      const updated = (await res.json()) as MarketSummary;
      updateMarket(updated);
    } catch (err) {
      setActionError(getErrorMessage(err, "Failed to reject/cancel market"));
    } finally {
      setBusyMarketId(null);
    }
  };

  const handleClose = async (marketId: string) => {
    if (!marketId) {
      setActionError("Missing market id for close.");
      return;
    }
    setActionError(null);
    setBusyMarketId(marketId);
    try {
      const res = await apiFetch(`/api/markets/${marketId}/close`, {
        method: "POST",
      });
      const updated = (await res.json()) as MarketSummary;
      updateMarket(updated);
    } catch (err) {
      setActionError(getErrorMessage(err, "Failed to close market"));
    } finally {
      setBusyMarketId(null);
    }
  };

  const renderResolvedOutcome = (market: MarketSummary) => {
    if (!market.resolvedOutcomeId || !market.outcomes?.length) {
      return "-";
    }
    const outcome = market.outcomes.find(
      (item) => item.id === market.resolvedOutcomeId,
    );
    if (!outcome) return market.resolvedOutcomeId;
    return `${outcome.label} (${market.resolvedPosition ?? "YES"})`;
  };

  const renderPercent = (value?: number) => {
    if (typeof value !== "number") {
      return "-";
    }

    return `${(value * 100).toFixed(1)}%`;
  };

  const getReferenceOutcome = (market: MarketSummary) => {
    if (!market.outcomes?.length) {
      return null;
    }

    return [...market.outcomes].sort((a, b) => a.position - b.position)[0] ?? null;
  };

  const formatEventEndAt = (market: MarketSummary) => {
    const value = market.event?.resolveAt;
    if (!value) {
      return "-";
    }

    return new Date(value).toLocaleString();
  };

  const renderMarketTable = (title: string, rows: MarketSummary[]) => {
    if (rows.length === 0) {
      return (
        <div className="mt-5">
          <h3 className="mb-2 text-lg font-semibold text-stone-200">{title}</h3>
          <p className="text-sm text-stone-300">Nincs market ebben a csoportban.</p>
        </div>
      );
    }

    return (
      <div className="mt-5">
        <h3 className="mb-2 text-lg font-semibold text-stone-200">{title}</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1450px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-stone-700/70 bg-stone-800/90 px-3 py-2 text-left font-semibold text-stone-200">Event</th>
              <th className="border-b border-stone-700/70 bg-stone-800/90 px-3 py-2 text-left font-semibold text-stone-200">Question</th>
              <th className="border-b border-stone-700/70 bg-stone-800/90 px-3 py-2 text-left font-semibold text-stone-200">Status</th>
              <th className="border-b border-stone-700/70 bg-stone-800/90 px-3 py-2 text-left font-semibold text-stone-200">Igen %</th>
              <th className="border-b border-stone-700/70 bg-stone-800/90 px-3 py-2 text-left font-semibold text-stone-200">Nem %</th>
              <th className="border-b border-stone-700/70 bg-stone-800/90 px-3 py-2 text-left font-semibold text-stone-200">Betting close</th>
              <th className="border-b border-stone-700/70 bg-stone-800/90 px-3 py-2 text-left font-semibold text-stone-200">Esemény vége</th>
              <th className="border-b border-stone-700/70 bg-stone-800/90 px-3 py-2 text-left font-semibold text-stone-200">Creator</th>
              <th className="border-b border-stone-700/70 bg-stone-800/90 px-3 py-2 text-left font-semibold text-stone-200">Resolved outcome</th>
              <th className="border-b border-stone-700/70 bg-stone-800/90 px-3 py-2 text-left font-semibold text-stone-200">Winning position</th>
              <th className="border-b border-stone-700/70 bg-stone-800/90 px-3 py-2 text-left font-semibold text-stone-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((market) => {
              const canApprove = market.status === "PENDING_APPROVAL";
              const canReject = market.status === "PENDING_APPROVAL";
              const canClose = market.status === "OPEN";
              const canCancel = market.status === "OPEN" || market.status === "CLOSED";
              const canResolve = market.status === "CLOSED";
              const busy = busyMarketId === market.id;
              const referenceOutcome = getReferenceOutcome(market);

              return (
                <tr key={market.id}>
                  <td className="border-b border-stone-700/70 px-3 py-2 text-stone-300">{market.event?.question ?? "-"}</td>
                  <td className="border-b border-stone-700/70 px-3 py-2 text-stone-300">{market.question}</td>
                  <td className="border-b border-stone-700/70 px-3 py-2 text-stone-300">{statusLabel(market.status)}</td>
                  <td className="border-b border-stone-700/70 px-3 py-2 text-stone-300">{renderPercent(referenceOutcome?.yesPrice)}</td>
                  <td className="border-b border-stone-700/70 px-3 py-2 text-stone-300">{renderPercent(referenceOutcome?.noPrice)}</td>
                  <td className="border-b border-stone-700/70 px-3 py-2 text-stone-300">{new Date(market.bettingCloseAt).toLocaleString()}</td>
                  <td className="border-b border-stone-700/70 px-3 py-2 text-stone-300">{formatEventEndAt(market)}</td>
                  <td className="border-b border-stone-700/70 px-3 py-2 text-stone-300">{market.createdByName ?? "-"}</td>
                  <td className="border-b border-stone-700/70 px-3 py-2 text-stone-300">{renderResolvedOutcome(market)}</td>
                  <td className="border-b border-stone-700/70 px-3 py-2">
                    <select
                      className="rounded-md border border-stone-600 bg-stone-800 px-2 py-1 text-sm text-stone-100 disabled:opacity-60"
                      value={selectedPositionByMarket[market.id] ?? "YES"}
                      onChange={(event) => {
                        const value =
                          event.target.value === "NO" ? "NO" : "YES";
                        setSelectedPositionByMarket((prev) => ({
                          ...prev,
                          [market.id]: value,
                        }));
                      }}
                      disabled={!market.outcomes?.length}
                    >
                      <option value="YES">YES</option>
                      <option value="NO">NO</option>
                    </select>
                  </td>
                  <td className="border-b border-stone-700/70 px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleApprove(market.id)}
                        disabled={!canApprove || busy}
                        className="cursor-pointer rounded-md border border-yellow-500/60 bg-yellow-500/90 px-2 py-1 text-xs font-semibold text-stone-900 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:border-stone-700 disabled:bg-stone-700 disabled:text-stone-400"
                      >
                        {busy && canApprove ? "Approving…" : "Approve"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleClose(market.id)}
                        disabled={!canClose || busy}
                        className="cursor-pointer rounded-md border border-stone-600 bg-stone-800 px-2 py-1 text-xs font-semibold text-stone-100 transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busy && canClose ? "Closing…" : "Close"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectOrCancel(market.id)}
                        disabled={!(canReject || canCancel) || busy}
                        className="cursor-pointer rounded-md border border-red-500/60 bg-red-500/80 px-2 py-1 text-xs font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:border-stone-700 disabled:bg-stone-700 disabled:text-stone-400"
                      >
                        {busy && (canReject || canCancel)
                          ? canReject
                            ? "Rejecting…"
                            : "Cancelling…"
                          : canReject
                            ? "Reject"
                            : "Cancel"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolve(market.id)}
                        disabled={!canResolve || busy}
                        className="cursor-pointer rounded-md border border-emerald-500/60 bg-emerald-500/80 px-2 py-1 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:border-stone-700 disabled:bg-stone-700 disabled:text-stone-400"
                      >
                        {busy && canResolve ? "Resolving…" : "Resolve"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold text-stone-100">Markets</h2>
      {loading && <p className="text-sm text-stone-300">Loading markets…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {actionError && <p className="text-sm text-red-500">{actionError}</p>}
      {!loading && !error && markets.length === 0 && (
        <p className="text-sm text-stone-300">No markets available.</p>
      )}

      {!loading && markets.length > 0 && (
        <>
          {renderMarketTable(
            "Lezárandó (esemény véget ért) marketek - Markets to resolve",
            marketsToResolve,
          )}
          {renderMarketTable(
            "Új, approveolandó marketek - Markets to approve",
            marketsToApprove,
          )}
          {renderMarketTable(
            "Lezárandó (fogadás véget ért) marketek - Markets to close",
            openMarketsToClose,
          )}
          {renderMarketTable("Aktív (még fogadható) marketek", activeBettableMarkets)}
          {renderMarketTable("Lezárt (resolved) marketek", resolvedMarkets)}
        </>
      )}
    </section>
  );
}
