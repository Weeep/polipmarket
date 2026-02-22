export type AchievementDefinitionDTO = {
  id: string;
  number: number;
  code: string;
  title: string;
  description: string | null;
  reward: number;
  category: string;
  targetValue: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
