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
};

type MarketEvent = {
  id: string;
  question: string;
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

    apiFetch("/api/markets?include=outcomes&includePending=true")
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

  const expiredOpenMarkets = useMemo(() => {
    const now = Date.now();
    return markets.filter(
      (market) =>
        market.status === "OPEN" && new Date(market.bettingCloseAt).getTime() <= now,
    );
  }, [markets]);

  const nonExpiredOrNonOpenMarkets = useMemo(() => {
    const expiredIds = new Set(expiredOpenMarkets.map((market) => market.id));
    return markets.filter((market) => !expiredIds.has(market.id));
  }, [expiredOpenMarkets, markets]);

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

  const handleCancel = async (marketId: string) => {
    if (!marketId) {
      setActionError("Missing market id for cancel.");
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
      setActionError(getErrorMessage(err, "Failed to cancel market"));
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

  const renderMarketTable = (title: string, rows: MarketSummary[]) => {
    if (rows.length === 0) {
      return (
        <div style={{ marginTop: 20 }}>
          <h3>{title}</h3>
          <p>Nincs market ebben a csoportban.</p>
        </div>
      );
    }

    return (
      <div style={{ marginTop: 20 }}>
        <h3>{title}</h3>
        <table border={1} cellPadding={8} style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>Event</th>
              <th>Question</th>
              <th>Status</th>
              <th>Betting close</th>
              <th>Resolved outcome</th>
              <th>Winning position</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((market) => {
              const canApprove = market.status === "PENDING_APPROVAL";
              const canClose = market.status === "OPEN";
              const canCancel =
                market.status === "PENDING_APPROVAL" ||
                market.status === "OPEN" ||
                market.status === "CLOSED";
              const canResolve = market.status === "CLOSED";
              const busy = busyMarketId === market.id;

              return (
                <tr key={market.id}>
                  <td>{market.event?.question ?? "-"}</td>
                  <td>{market.question}</td>
                  <td>{statusLabel(market.status)}</td>
                  <td>{new Date(market.bettingCloseAt).toLocaleString()}</td>
                  <td>{renderResolvedOutcome(market)}</td>
                  <td>
                    <select
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
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleApprove(market.id)}
                        disabled={!canApprove || busy}
                      >
                        {busy && canApprove ? "Approving…" : "Approve"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleClose(market.id)}
                        disabled={!canClose || busy}
                      >
                        {busy && canClose ? "Closing…" : "Close"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancel(market.id)}
                        disabled={!canCancel || busy}
                      >
                        {busy && canCancel ? "Cancelling…" : "Cancel"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolve(market.id)}
                        disabled={!canResolve || busy}
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
    );
  };

  return (
    <section style={{ marginTop: 32 }}>
      <h2>Markets</h2>
      {loading && <p>Loading markets…</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {actionError && <p style={{ color: "crimson" }}>{actionError}</p>}
      {!loading && !error && markets.length === 0 && (
        <p>No markets available.</p>
      )}

      {!loading && markets.length > 0 && (
        <>
          {renderMarketTable("Lezárandó (lejárt) marketek", expiredOpenMarkets)}
          {renderMarketTable("További marketek", nonExpiredOrNonOpenMarkets)}
        </>
      )}
    </section>
  );
}
