import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MyBetDTO } from "../dto/myBetDTO";

type BetStatusFilter = "open" | "closed";

type GetMyBetsInput = {
  userId: string;
  status?: BetStatusFilter;
  limit?: number;
  offset?: number;
  eventId?: string;
};

type BetRow = {
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

const OPEN_SHARES_EPSILON = 0.000001;

function mapBetStatus(row: BetRow): MyBetDTO["status"] {
  if (row.buyStatus === "CANCELLED") {
    return "CANCELLED";
  }

  return row.remainingShares > OPEN_SHARES_EPSILON ? "OPEN" : "FILLED";
}

export async function getMyBets(input: GetMyBetsInput): Promise<MyBetDTO[]> {
  const limit = Math.max(1, Math.min(input.limit ?? 50, 500));
  const offset = Math.max(0, input.offset ?? 0);

  const rows = await prisma.$queryRaw<BetRow[]>(Prisma.sql`
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
    WHERE
      pl."userId" = ${input.userId}
      ${input.eventId ? Prisma.sql`AND m."eventId" = ${input.eventId}` : Prisma.empty}
      ${
        input.status === "open"
          ? Prisma.sql`AND bo."status" <> 'CANCELLED' AND pl."remainingShares" > ${OPEN_SHARES_EPSILON}`
          : input.status === "closed"
            ? Prisma.sql`AND (bo."status" = 'CANCELLED' OR pl."remainingShares" <= ${OPEN_SHARES_EPSILON})`
            : Prisma.empty
      }
    ORDER BY bo."createdAt" DESC, pl."id" DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  return rows.map((row) => ({
    lotId: row.lotId,
    orderId: row.buyOrderId,
    marketId: row.marketId,
    question: row.marketQuestion,
    eventId: row.eventId,
    eventQuestion: row.eventQuestion,
    closesAt: new Date(row.marketClosesAt).toISOString(),
    resolvesAt: row.marketResolvesAt ? new Date(row.marketResolvesAt).toISOString() : null,
    marketStatus: row.marketStatus,
    resolvedOutcomeId: row.marketResolvedOutcomeId,
    resolvedPosition: row.marketResolvedPosition,
    outcomeId: row.outcomeId,
    outcomeLabel: row.outcomeLabel,
    position: row.position,
    amount: row.entryGrossAmount,
    price: row.entryPrice,
    shares: mapBetStatus(row) === "OPEN" ? row.remainingShares : row.openedShares,
    status: mapBetStatus(row),
    createdAt: new Date(row.buyCreatedAt).toISOString(),
    soldAmount: row.soldNetAmount ?? undefined,
    soldPrice:
      row.soldShares != null && row.soldShares > 0 && row.soldGrossAmount != null
        ? row.soldGrossAmount / row.soldShares
        : undefined,
    soldShares: row.soldShares ?? undefined,
    soldGrossAmount: row.soldGrossAmount ?? undefined,
    soldFee: row.soldFee ?? undefined,
    soldNetAmount: row.soldNetAmount ?? undefined,
    soldAt: row.soldAt ? new Date(row.soldAt).toISOString() : undefined,
  }));
}
