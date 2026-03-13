import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { prisma } from "@/lib/prisma";

export const POST = withAuth(async (user) => {
  await prisma.user.updateMany({
    where: {
      id: user.id,
      authType: "GUEST",
      deletedAt: null,
    },
    data: {
      guestKeyAcknowledgedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
});
