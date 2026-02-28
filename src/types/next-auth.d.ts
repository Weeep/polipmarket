import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      impersonatedBy?: string | null;
      role?: string;
      sessionVersion?: number;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    impersonatedUserId?: string | null;
    sessionVersion?: number;
  }
}
