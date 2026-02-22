import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { prisma } from "@/lib/prisma";
import { evaluateAchievementsForUser } from "@/modules/achievement/application/evaluateAchievementsForUser";

export const POST = withAuth(async (user) => {
  await prisma.$transaction(async (tx) => {
    await evaluateAchievementsForUser({
      userId: user.id,
      tx,
    });
  });

  return NextResponse.json({ ok: true });
});
