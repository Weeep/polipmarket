import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/infrastructure/authOptions";
import { prisma } from "@/lib/prisma";

export async function ensureUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { deletedAt: true, sessionVersion: true },
  });

  if (!dbUser || dbUser.deletedAt) {
    throw new Error("UNAUTHORIZED");
  }

  if (
    typeof session.user.sessionVersion === "number" &&
    session.user.sessionVersion !== dbUser.sessionVersion
  ) {
    throw new Error("UNAUTHORIZED");
  }

  return session.user;
}
