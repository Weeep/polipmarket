import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

type AppToken = {
  sub?: string;
  impersonatedUserId?: string | null;
};

type AppSessionUser = {
  id?: string;
  impersonatedBy?: string | null;
};

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;

      const googleId = account.providerAccountId;
      if (!googleId) return false;

      const email = user.email ?? undefined;

      await prisma.$transaction(async (tx) => {
        const dbUser = await tx.user.upsert({
          where: { id: googleId },
          update: {
            name: user.name,
            image: user.image,
            email,
          },
          create: {
            id: googleId,
            email: email!,
            name: user.name,
            image: user.image,
          },
        });

        await tx.wallet.upsert({
          where: { userId: dbUser.id },
          update: {},
          create: {
            userId: dbUser.id,
            balance: 1000,
          },
        });
      });

      return true;
    },

    async jwt({ token, account, trigger, session }) {
      const appToken = token as AppToken;

      if (account?.provider === "google") {
        appToken.sub = account.providerAccountId;
      }

      if (trigger === "update" && session?.impersonatedUserId !== undefined) {
        appToken.impersonatedUserId = session.impersonatedUserId ?? null;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && typeof token.sub === "string") {
        const appToken = token as AppToken;
        const sessionUser = session.user as AppSessionUser;
        const actingUserId = appToken.impersonatedUserId ?? token.sub;

        sessionUser.id = actingUserId;
        sessionUser.impersonatedBy = appToken.impersonatedUserId
          ? token.sub
          : null;
      }

      return session;
    },
  },
};
