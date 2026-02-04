import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      impersonatedBy?: string | null;
      role?: string;
    } & DefaultSession["user"];
  }

  interface JWT {
    impersonatedUserId?: string | null;
  }
}
