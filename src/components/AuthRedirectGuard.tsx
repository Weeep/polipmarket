"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMe } from "@/context/MeContext";

export function AuthRedirectGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { me, isMeResolved } = useMe();

  useEffect(() => {
    if (!isMeResolved) {
      return;
    }

    if (!me && pathname !== "/about") {
      router.replace("/about");
    }
  }, [isMeResolved, me, pathname, router]);

  if (!isMeResolved) {
    return null;
  }

  if (!me && pathname !== "/about") {
    return null;
  }

  return <>{children}</>;
}
