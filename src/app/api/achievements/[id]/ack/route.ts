import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { userAchievementRepository } from "@/modules/achievement/infrastructure/userAchievementRepository";

type Params = {
  params: {
    id: string;
  };
};

export const POST = withAuth<Params>(async (user, _req, context) => {
  const updatedCount = await userAchievementRepository.acknowledgeByAchievementId(
    user.id,
    context.params.id,
  );

  if (updatedCount === 0) {
    return NextResponse.json({ error: "Achievement not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
});
