import { ensureUser } from "./ensureUser";
import { UserRepository } from "@/modules/user/infrastructure/UserRepository";

export async function ensureAdmin() {
  const sessionUser = await ensureUser();

  const repo = new UserRepository();
  const user = await repo.findById(sessionUser.id);

  if (!user || !user.isAdmin()) {
    throw new Error("FORBIDDEN");
  }

  return user;
}
