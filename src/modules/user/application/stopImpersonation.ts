import { ensureAdmin } from "@/modules/auth/application/ensureAdmin";

export async function stopImpersonation() {
  await ensureAdmin();

  return {
    impersonatedUserId: null,
  };
}
