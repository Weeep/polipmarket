import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/infrastructure/authOptions";

export async function ensureUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }

  return session.user;
}
