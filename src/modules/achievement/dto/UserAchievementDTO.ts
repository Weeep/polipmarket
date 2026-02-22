export type UserAchievementDTO = {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: Date;
  acknowledgedAt: Date | null;
  rewardGranted: number;
  createdAt: Date;
};
