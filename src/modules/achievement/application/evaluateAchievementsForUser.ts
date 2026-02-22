import { prisma } from "@/lib/prisma";
import { userAchievementRepository } from "@/modules/achievement/infrastructure/userAchievementRepository";
import { walletLedgerRepository } from "@/modules/achievement/infrastructure/walletLedgerRepository";
import { Prisma } from "@prisma/client";
import { checkAchievement } from "./checkers";

type EvaluateAchievementsInput = {
  userId: string;
  tx?: Prisma.TransactionClient;
};

type UnlockedAchievement = {
  achievementId: string;
  code: string;
  rewardGranted: number;
};

function shouldStopCategoryProgression(definition: {
  category: string;
  targetValue: number | null;
}) {
  return definition.targetValue != null && definition.category !== "LOGIN";
}

export async function evaluateAchievementsForUser(
  input: EvaluateAchievementsInput,
): Promise<UnlockedAchievement[]> {
  const run = async (tx: Prisma.TransactionClient): Promise<UnlockedAchievement[]> => {
    const activeDefinitions = await tx.achievementDefinition.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { targetValue: "asc" }, { number: "asc" }],
    });

    const unlockedSet = await userAchievementRepository.findUnlockedIds(input.userId);
    const blockedCategory = new Set<string>();
    const unlocked: UnlockedAchievement[] = [];
    const checkerContext = {
      userId: input.userId,
      tx,
      metricCache: new Map(),
    };

    for (const definition of activeDefinitions) {
      if (unlockedSet.has(definition.id)) {
        continue;
      }

      if (blockedCategory.has(definition.category) && definition.targetValue != null) {
        continue;
      }

      const passed = await checkAchievement(definition, checkerContext);
      if (!passed) {
        if (shouldStopCategoryProgression(definition)) {
          blockedCategory.add(definition.category);
        }
        continue;
      }

      try {
        await userAchievementRepository.grant(
          input.userId,
          definition.id,
          definition.reward,
          tx,
        );
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          continue;
        }

        throw error;
      }

      if (definition.reward > 0) {
        await tx.wallet.update({
          where: { userId: input.userId },
          data: {
            balance: {
              increment: definition.reward,
            },
          },
        });

        await walletLedgerRepository.createEntry(
          {
            userId: input.userId,
            amount: definition.reward,
            reason: "ACHIEVEMENT_REWARD",
            referenceType: "ACHIEVEMENT",
            referenceId: definition.id,
          },
          tx,
        );
      }

      unlocked.push({
        achievementId: definition.id,
        code: definition.code,
        rewardGranted: definition.reward,
      });
      unlockedSet.add(definition.id);
    }

    return unlocked;
  };

  if (input.tx) {
    return run(input.tx);
  }

  return prisma.$transaction((tx) => run(tx));
}
