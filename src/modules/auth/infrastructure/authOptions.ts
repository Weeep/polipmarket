import { AuthOptions } from "next-auth";
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

function getGoogleLegacyScopedId(googleId: string) {
  return `google:${googleId}`;
}

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

      const legacyScopedGoogleId = getGoogleLegacyScopedId(googleId);

      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ id: googleId }, { id: legacyScopedGoogleId }],
        },
        select: { id: true, deletedAt: true },
      });

      if (existingUser?.deletedAt) {
        return false;
      }

      const userId = existingUser?.id ?? googleId;
      const email = user.email ?? undefined;

      if (!existingUser && !email) {
        return false;
      }

      await prisma.$transaction(async (tx) => {
        const dbUser = await tx.user.upsert({
          where: { id: userId },
          update: {
            name: user.name,
            image: user.image,
            email,
          },
          create: {
            id: userId,
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

        await evaluateAchievementsForUser({
          userId: dbUser.id,
          tx,
        });
      });

      return true;
    },

    async jwt({ token, account, trigger, session }) {
      const appToken = token as AppToken;

      if (account?.provider === "google" && account.providerAccountId) {
        const googleId = account.providerAccountId;
        const legacyScopedGoogleId = getGoogleLegacyScopedId(googleId);

        const dbUser = await prisma.user.findFirst({
          where: {
            OR: [{ id: googleId }, { id: legacyScopedGoogleId }],
          },
          select: { id: true, sessionVersion: true },
        });

        appToken.sub = dbUser?.id ?? googleId;
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
