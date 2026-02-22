import { prisma } from "@/lib/prisma";
import type { AchievementDefinitionUpsertInput } from "@/modules/achievement/domain/Achievement";
import { Prisma } from "@prisma/client";

export type AchievementDefinitionRepository = {
  findAllActive(): Promise<Prisma.AchievementDefinitionGetPayload<object>[]>;
  findByCode(code: string): Promise<Prisma.AchievementDefinitionGetPayload<object> | null>;
  upsertMany(definitions: AchievementDefinitionUpsertInput[]): Promise<void>;
};

export const achievementDefinitionRepository: AchievementDefinitionRepository = {
  async findAllActive() {
    return prisma.achievementDefinition.findMany({
      where: { isActive: true },
      orderBy: { number: "asc" },
    });
  },

  async findByCode(code) {
    return prisma.achievementDefinition.findUnique({
      where: { code },
    });
  },

  async upsertMany(definitions) {
    await prisma.$transaction(
      definitions.map((definition) =>
        prisma.achievementDefinition.upsert({
          where: { code: definition.code },
          create: {
            number: definition.number,
            code: definition.code,
            title: definition.title,
            description: definition.description,
            reward: definition.reward,
            category: definition.category,
            targetValue: definition.targetValue,
            isActive: definition.isActive ?? true,
          },
          update: {
            number: definition.number,
            title: definition.title,
            description: definition.description,
            reward: definition.reward,
            category: definition.category,
            targetValue: definition.targetValue,
            isActive: definition.isActive ?? true,
          },
        }),
      ),
    );
  },
};
