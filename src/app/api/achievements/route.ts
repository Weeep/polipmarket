import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async (user) => {
  const definitions = await prisma.achievementDefinition.findMany({
    where: { isActive: true },
    orderBy: [{ number: "asc" }],
    include: {
      userAchievements: {
        where: { userId: user.id },
        orderBy: { unlockedAt: "desc" },
        take: 1,
      },
    },
  });

  const response = [];
  for (const definition of definitions) {
    const unlocked = definition.userAchievements[0] ?? null;

    response.push({
      id: definition.id,
      number: definition.number,
      code: definition.code,
      title: definition.title,
      description: definition.description,
      reward: definition.reward,
      category: definition.category,
      targetValue: definition.targetValue,
      isActive: definition.isActive,
      unlockedAt: unlocked?.unlockedAt ?? null,
      rewardGranted: unlocked?.rewardGranted ?? null,
      acknowledgedAt: unlocked?.acknowledgedAt ?? null,
    });
  }

  return NextResponse.json(response);
});
