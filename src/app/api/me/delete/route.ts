import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";

function parseReason(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 500);
}

export const POST = withAuth(async (user, req) => {
  const body = (await req.json().catch(() => ({}))) as { reason?: unknown };
  const reason = parseReason(body.reason);
  const deletedEmail = `deleted+${user.id}@anon.polipmarket.local`;

  type TransactionClient = Pick<typeof prisma, "userDeletionAudit" | "user" | "wallet">;

  await prisma.$transaction(async (tx: TransactionClient) => {
    await tx.userDeletionAudit.create({
      data: {
        userId: user.id,
        reason,
      },
    });

    await tx.user.update({
      where: { id: user.id },
      data: {
        email: deletedEmail,
        name: "Törölt felhasználó",
        image: null,
        role: "USER",
        deletedAt: new Date(),
        sessionVersion: {
          increment: 1,
        },
      },
    });

    await tx.wallet.updateMany({
      where: { userId: user.id },
      data: {
        balance: 0,
        locked: 0,
      },
    });
  });

  return NextResponse.json({ ok: true });
});
