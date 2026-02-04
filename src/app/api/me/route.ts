import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";

export const GET = withAuth(async (user) => {
  try {
    const prismaUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        wallet: {
          select: {
            balance: true,
            locked: true,
          },
        },
      },
    });

    if (!prismaUser || !prismaUser.wallet) {
      return NextResponse.json(
        { error: "User or wallet not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: prismaUser.id,
      email: prismaUser.email,
      name: prismaUser.name,
      image: prismaUser.image,
      role: prismaUser.role,
      balance: prismaUser.wallet.balance,
      locked: prismaUser.wallet.locked,
    } as UserInfoDTO);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
});
