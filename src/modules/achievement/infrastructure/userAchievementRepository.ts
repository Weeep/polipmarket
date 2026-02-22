import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type UserAchievementRepository = {
  findUnlockedIds(userId: string): Promise<Set<string>>;
  grant(
    userId: string,
    achievementId: string,
    rewardGranted: number,
    tx?: Prisma.TransactionClient,
  ): Promise<Prisma.UserAchievementGetPayload<object>>;
};

export const userAchievementRepository: UserAchievementRepository = {
  async findUnlockedIds(userId) {
    const unlocked = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    });

    return new Set(unlocked.map((item) => item.achievementId));
  },

  async grant(userId, achievementId, rewardGranted, tx) {
    const client = tx ?? prisma;

    return client.userAchievement.create({
      data: {
        userId,
        achievementId,
        rewardGranted,
      },
    });
  },
};
