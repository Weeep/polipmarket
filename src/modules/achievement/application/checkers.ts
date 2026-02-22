import { Prisma } from "@prisma/client";

type AchievementDefinition = Prisma.AchievementDefinitionGetPayload<object>;

type MetricKey = "uniqueBetEventCount" | "resolvedWinningBetCount";

export type CheckerContext = {
  userId: string;
  tx: Prisma.TransactionClient;
  metricCache: Map<MetricKey, Promise<number>>;
};

type Checker = (
  definition: AchievementDefinition,
  context: CheckerContext,
) => Promise<boolean>;

function getMetric(
  context: CheckerContext,
  key: MetricKey,
  producer: () => Promise<number>,
): Promise<number> {
  const cached = context.metricCache.get(key);
  if (cached) {
    return cached;
  }

  const promise = producer();
  context.metricCache.set(key, promise);
  return promise;
}

async function getUniqueBetEventCount(context: CheckerContext): Promise<number> {
  return getMetric(context, "uniqueBetEventCount", async () => {
    const rows = await context.tx.market.findMany({
      where: {
        orders: {
          some: {
            userId: context.userId,
            side: "BUY",
          },
        },
      },
      distinct: ["eventId"],
      select: { eventId: true },
    });

    return rows.length;
  });
}

async function getResolvedWinningBetCount(context: CheckerContext): Promise<number> {
  return getMetric(context, "resolvedWinningBetCount", async () => {
    const [yesWins, noWins] = await Promise.all([
      context.tx.order.count({
        where: {
          userId: context.userId,
          side: "BUY",
          position: "YES",
          market: {
            status: "RESOLVED",
            resolvedPosition: "YES",
          },
        },
      }),
      context.tx.order.count({
        where: {
          userId: context.userId,
          side: "BUY",
          position: "NO",
          market: {
            status: "RESOLVED",
            resolvedPosition: "NO",
          },
        },
      }),
    ]);

    return yesWins + noWins;
  });
}

const checkByCode: Record<string, Checker> = {
  async first_login() {
    return true;
  },
};

const checkByCategory: Record<string, Checker> = {
  async BET_EVENTS(definition, context) {
    if (definition.targetValue == null) {
      return false;
    }

    const count = await getUniqueBetEventCount(context);
    return count >= definition.targetValue;
  },
  async WIN_BETS(definition, context) {
    if (definition.targetValue == null) {
      return false;
    }

    const count = await getResolvedWinningBetCount(context);
    return count >= definition.targetValue;
  },
};

export async function checkAchievement(
  definition: AchievementDefinition,
  context: CheckerContext,
): Promise<boolean> {
  const byCode = checkByCode[definition.code];
  if (byCode) {
    return byCode(definition, context);
  }

  const byCategory = checkByCategory[definition.category];
  if (byCategory) {
    return byCategory(definition, context);
  }

  return false;
}
