"use client";

import { apiFetch } from "@/lib/apiFetch";
import { createContext, useContext, useEffect, useState } from "react";
import type { UserInfoDTO } from "@/modules/user/dto/UserInfoDTO";

type MeContextValue = {
  me: UserInfoDTO | null;
  refreshMe: () => Promise<void>;
};

const MeContext = createContext<MeContextValue | null>(null);

export function MeProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<UserInfoDTO | null>(null);

  async function refreshMe() {
    const res = await apiFetch("/api/me");
    if (res.ok) {
      setMe(await res.json());
    } else {
      setMe(null);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshMe();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  return (
    <MeContext.Provider value={{ me, refreshMe }}>
      {children}
    </MeContext.Provider>
  );
}

export function useMe() {
  const ctx = useContext(MeContext);
  if (!ctx) {
    throw new Error("useMe must be used inside MeProvider");
  }
  return ctx;
}
