import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { userAchievementRepository } from "@/modules/achievement/infrastructure/userAchievementRepository";

export const GET = withAuth(async (user) => {
  const unread = await userAchievementRepository.findUnreadByUserId(user.id);

  return NextResponse.json(
    unread.map((entry) => ({
      id: entry.id,
      achievementId: entry.achievementId,
      unlockedAt: entry.unlockedAt,
      rewardGranted: entry.rewardGranted,
      achievement: {
        id: entry.achievement.id,
        number: entry.achievement.number,
        code: entry.achievement.code,
        title: entry.achievement.title,
        description: entry.achievement.description,
        reward: entry.achievement.reward,
        category: entry.achievement.category,
        targetValue: entry.achievement.targetValue,
      },
    })),
  );
});
