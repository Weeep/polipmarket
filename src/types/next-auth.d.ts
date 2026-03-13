import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      impersonatedBy?: string | null;
      role?: string;
      sessionVersion?: number;
      isGuest?: boolean;
      guestRecoveryKey?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    impersonatedUserId?: string | null;
    sessionVersion?: number;
    isGuest?: boolean;
    guestRecoveryKey?: string | null;
  }
}
