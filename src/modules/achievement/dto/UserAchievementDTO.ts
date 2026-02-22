export type UserAchievementDTO = {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: Date;
  rewardGranted: number;
  createdAt: Date;
};
