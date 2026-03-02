import { prisma } from "@/lib/prisma";
import { MyEventMarketBetDTO } from "../dto/myEventMarketBetDTO";

type BetLotRow = {
  lotId: string;
  marketId: string;
  marketQuestion: string;
  marketStatus: string;
  marketClosesAt: string;
  marketResolvesAt: string | null;
  marketResolvedOutcomeId: string | null;
  marketResolvedPosition: "YES" | "NO" | null;
  eventId: string;
  eventQuestion: string;
  outcomeId: string;
  outcomeLabel: string;
  position: "YES" | "NO";
  buyOrderId: string;
  buyCreatedAt: string;
  buyStatus: string;
  openedShares: number;
  remainingShares: number;
  entryPrice: number;
  entryGrossAmount: number;
  soldShares: number | null;
  soldGrossAmount: number | null;
  soldFee: number | null;
  soldNetAmount: number | null;
  soldAt: string | null;
};

export async function getMyBetLots(
  userId: string,
  limit = 5,
): Promise<MyEventMarketBetDTO[]> {
  const rows = await prisma.$queryRaw<BetLotRow[]>`
    SELECT
      pl."id" as "lotId",
      pl."marketId" as "marketId",
      m."question" as "marketQuestion",
      m."status" as "marketStatus",
      m."bettingCloseAt" as "marketClosesAt",
      m."resolveAt" as "marketResolvesAt",
      m."resolvedOutcomeId" as "marketResolvedOutcomeId",
      m."resolvedPosition" as "marketResolvedPosition",
      e."id" as "eventId",
      e."question" as "eventQuestion",
      pl."outcomeId" as "outcomeId",
      o."label" as "outcomeLabel",
      pl."position" as "position",
      pl."buyOrderId" as "buyOrderId",
      bo."createdAt" as "buyCreatedAt",
      bo."status" as "buyStatus",
      pl."openedShares" as "openedShares",
      pl."remainingShares" as "remainingShares",
      pl."entryPrice" as "entryPrice",
      pl."entryGrossAmount" as "entryGrossAmount",
      sellAgg."soldShares" as "soldShares",
      sellAgg."soldGrossAmount" as "soldGrossAmount",
      sellAgg."soldFee" as "soldFee",
      sellAgg."soldNetAmount" as "soldNetAmount",
      sellAgg."soldAt" as "soldAt"
    FROM "PositionLot" pl
    JOIN "Order" bo ON bo."id" = pl."buyOrderId"
    JOIN "Market" m ON m."id" = pl."marketId"
    JOIN "Event" e ON e."id" = m."eventId"
    JOIN "Outcome" o ON o."id" = pl."outcomeId"
    LEFT JOIN (
      SELECT
        lc."buyLotId" as "buyLotId",
        SUM(lc."closedShares") as "soldShares",
        SUM(lc."grossAmount") as "soldGrossAmount",
        SUM(lc."feeAmount") as "soldFee",
        SUM(lc."netAmount") as "soldNetAmount",
        MAX(lc."createdAt") as "soldAt"
      FROM "LotClose" lc
      GROUP BY lc."buyLotId"
    ) sellAgg ON sellAgg."buyLotId" = pl."id"
    WHERE pl."userId" = ${userId}
    ORDER BY bo."createdAt" DESC, pl."id" DESC
    LIMIT ${limit}
  `;

  const latestLots = rows.map<MyEventMarketBetDTO>((row) => {
    const isCancelled = row.buyStatus === "CANCELLED";
    const isOpen = !isCancelled && row.remainingShares > 0.000001;
    const status = isCancelled ? "CANCELLED" : isOpen ? "OPEN" : "FILLED";

    return {
      marketId: row.marketId,
      question: row.marketQuestion,
      eventId: row.eventId,
      eventQuestion: row.eventQuestion,
      closesAt: new Date(row.marketClosesAt).toISOString(),
      resolvesAt: row.marketResolvesAt
        ? new Date(row.marketResolvesAt).toISOString()
        : null,
      status: row.marketStatus,
      resolvedOutcomeId: row.marketResolvedOutcomeId,
      resolvedPosition: row.marketResolvedPosition,
      latestBetAt: new Date(row.buyCreatedAt).toISOString(),
      bets: [
        {
          lotId: row.lotId,
          orderId: row.buyOrderId,
          outcomeId: row.outcomeId,
          outcomeLabel: row.outcomeLabel,
          position: row.position,
          amount: row.entryGrossAmount,
          price: row.entryPrice,
          shares: isOpen ? row.remainingShares : row.openedShares,
          status,
          createdAt: new Date(row.buyCreatedAt).toISOString(),
          soldAmount: row.soldNetAmount ?? undefined,
          soldPrice:
            row.soldShares != null &&
            row.soldShares > 0 &&
            row.soldGrossAmount != null
              ? row.soldGrossAmount / row.soldShares
              : undefined,
          soldShares: row.soldShares ?? undefined,
          soldGrossAmount: row.soldGrossAmount ?? undefined,
          soldFee: row.soldFee ?? undefined,
          soldNetAmount: row.soldNetAmount ?? undefined,
          soldAt: row.soldAt ? new Date(row.soldAt).toISOString() : undefined,
        },
      ],
    };
  });

  const marketsById = new Map<string, MyEventMarketBetDTO>();

  for (const lot of latestLots) {
    const existing = marketsById.get(lot.marketId);

    if (!existing) {
      marketsById.set(lot.marketId, lot);
      continue;
    }

    existing.bets.push(...lot.bets);

    if (new Date(lot.latestBetAt) > new Date(existing.latestBetAt)) {
      existing.latestBetAt = lot.latestBetAt;
    }
  }

  return Array.from(marketsById.values());
}
