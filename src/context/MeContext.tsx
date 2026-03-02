"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { UserInfoDTO } from "@/modules/user/dto/UserInfoDTO";

type MeContextValue = {
  me: UserInfoDTO | null;
  isMeResolved: boolean;
  refreshMe: () => Promise<void>;
};

const MeContext = createContext<MeContextValue | null>(null);

export function MeProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<UserInfoDTO | null>(null);
  const [isMeResolved, setIsMeResolved] = useState(false);

  async function refreshMe() {
    try {
      const res = await fetch("/api/me");

      if (res.ok) {
        setMe(await res.json());
        return;
      }

      if (res.status === 401 || res.status === 403) {
        setMe(null);
      }
    } catch {
      // Keep previous user state on transient network/server errors.
    } finally {
      setIsMeResolved(true);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshMe();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  return (
    <MeContext.Provider value={{ me, isMeResolved, refreshMe }}>
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
