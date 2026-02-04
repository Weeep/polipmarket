import { ForbiddenUserActionError } from "../domain/UserErrors";
import { User } from "../domain/User";

export function impersonateUser(admin: User, targetUserId: string) {
  if (!admin.isAdmin()) {
    throw new ForbiddenUserActionError();
  }

  return {
    impersonatedUserId: targetUserId,
  };
}
