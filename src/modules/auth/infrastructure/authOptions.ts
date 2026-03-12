import { AuthOptions } from "next-auth";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { evaluateAchievementsForUser } from "@/modules/achievement/application/evaluateAchievementsForUser";

type AppToken = {
  sub?: string;
  impersonatedUserId?: string | null;
  sessionVersion?: number;
};

type AppSessionUser = {
  id?: string;
  impersonatedBy?: string | null;
  sessionVersion?: number;
};

function getScopedUserId(provider: string, providerAccountId: string) {
  return `${provider}:${providerAccountId}`;
}

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async signIn({ user, account }) {
      if (!account?.providerAccountId) return false;

      const isGoogle = account.provider === "google";
      const isFacebook = account.provider === "facebook";

      const userId = getScopedUserId(account.provider, account.providerAccountId);

      if (!isGoogle && !isFacebook) return true;
      if (isGoogle && !user.email) return false;

      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { deletedAt: true },
      });

      if (existingUser?.deletedAt) {
        return false;
      }

      await prisma.$transaction(async (tx) => {
        const dbUser = await tx.user.upsert({
          where: { id: userId },
          update: {
            name: user.name,
            image: user.image,
            email: isGoogle ? user.email ?? null : null,
            fbProfile: isFacebook ? account.providerAccountId : null,
          },
          create: {
            id: userId,
            email: isGoogle ? user.email ?? null : null,
            fbProfile: isFacebook ? account.providerAccountId : null,
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

        await evaluateAchievementsForUser({
          userId: dbUser.id,
          tx,
        });
      });

      return true;
    },

    async jwt({ token, account, trigger, session }) {
      const appToken = token as AppToken;

      if (account?.providerAccountId) {
        const userId = getScopedUserId(account.provider, account.providerAccountId);
        appToken.sub = userId;

        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { sessionVersion: true },
        });

        appToken.sessionVersion = dbUser?.sessionVersion ?? 0;
      }

      if (trigger === "update" && session?.impersonatedUserId !== undefined) {
        appToken.impersonatedUserId = session.impersonatedUserId ?? null;
      }

      return token;
    },

    async redirect({ url, baseUrl }) {
      const appUrl = baseUrl || process.env.NEXTAUTH_URL || "";

      if (url.startsWith("/")) {
        return `${appUrl}${url}`;
      }

      try {
        if (new URL(url).origin === new URL(appUrl).origin) {
          return url;
        }
      } catch {
        return appUrl;
      }

      return appUrl;
    },

    async session({ session, token }) {
      if (session.user && typeof token.sub === "string") {
        const appToken = token as AppToken;
        const sessionUser = session.user as AppSessionUser;
        const actingUserId = appToken.impersonatedUserId ?? token.sub;

        sessionUser.id = actingUserId;
        sessionUser.impersonatedBy = appToken.impersonatedUserId ? token.sub : null;
        sessionUser.sessionVersion = appToken.sessionVersion ?? 0;
      }

      return session;
    },
  },
};
