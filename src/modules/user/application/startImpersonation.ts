import { ensureAdmin } from "@/modules/auth/application/ensureAdmin";

export async function startImpersonation(targetUserId: string) {
  const admin = await ensureAdmin();

  return {
    impersonatedUserId: targetUserId,
    adminUserId: admin.id,
  };
}
