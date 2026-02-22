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
  findUnreadByUserId(userId: string): Promise<
    Prisma.UserAchievementGetPayload<{
      include: {
        achievement: true;
      };
    }>[
    ]
  >;
  acknowledgeByAchievementId(
    userId: string,
    achievementId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number>;
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

  async findUnreadByUserId(userId) {
    return prisma.userAchievement.findMany({
      where: {
        userId,
        acknowledgedAt: null,
      },
      include: {
        achievement: true,
      },
      orderBy: [{ unlockedAt: "asc" }, { createdAt: "asc" }],
    });
  },

  async acknowledgeByAchievementId(userId, achievementId, tx) {
    const client = tx ?? prisma;
    const result = await client.userAchievement.updateMany({
      where: {
        userId,
        achievementId,
        acknowledgedAt: null,
      },
      data: {
        acknowledgedAt: new Date(),
      },
    });

    return result.count;
  },
};
