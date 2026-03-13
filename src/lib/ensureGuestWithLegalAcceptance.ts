import { signIn } from "next-auth/react";
import { apiFetch } from "@/lib/apiFetch";
import type { UserInfoDTO } from "@/modules/user/dto/UserInfoDTO";

type EnsureGuestWithLegalAcceptanceInput = {
  me: UserInfoDTO | null;
  refreshMe: () => Promise<void>;
};

export async function ensureGuestWithLegalAcceptance({
  me,
  refreshMe,
}: EnsureGuestWithLegalAcceptanceInput) {
  if (me) {
    return;
  }

  const signInResult = await signIn("guest", {
    mode: "create",
    redirect: false,
  });

  if (!signInResult || signInResult.error) {
    throw new Error("A vendég belépés sikertelen. Próbáld újra.");
  }

  await apiFetch("/api/legal/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      acceptTerms: true,
      acceptPrivacy: true,
    }),
  });

  await refreshMe();
}
