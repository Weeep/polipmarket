import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { createHash, randomBytes, randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { evaluateAchievementsForUser } from "@/modules/achievement/application/evaluateAchievementsForUser";

type AppToken = {
  sub?: string;
  impersonatedUserId?: string | null;
  sessionVersion?: number;
  isGuest?: boolean;
  guestRecoveryKey?: string | null;
};

type AppSessionUser = {
  id?: string;
  impersonatedBy?: string | null;
  sessionVersion?: number;
  isGuest?: boolean;
  guestRecoveryKey?: string | null;
};

type AuthorizeResult = {
  id: string;
  guestRecoveryKey?: string;
};

function getGoogleLegacyScopedId(googleId: string) {
  return `google:${googleId}`;
}

function hashGuestRecoveryKeyWithSecret(recoveryKey: string, secret: string) {
  return createHash("sha256").update(`${secret}:${recoveryKey}`).digest("hex");
}

function getCurrentGuestRecoveryKeySecret() {
  return process.env.GUEST_RECOVERY_KEY_SECRET ?? "polipmarket-guest-recovery-v1";
}

function getLegacyGuestRecoveryKeySecrets() {
  const configuredLegacySecrets = process.env.GUEST_RECOVERY_KEY_LEGACY_SECRETS
    ?.split(",")
    .map((secret) => secret.trim())
    .filter(Boolean);

  if (configuredLegacySecrets && configuredLegacySecrets.length > 0) {
    return configuredLegacySecrets;
  }

  const nextAuthLegacySecret = process.env.NEXTAUTH_SECRET;
  if (nextAuthLegacySecret) {
    return [nextAuthLegacySecret];
  }

  return ["polipmarket-guest-pepper"];
}

function getGuestRecoveryKeyHash(recoveryKey: string) {
  return hashGuestRecoveryKeyWithSecret(
    recoveryKey,
    getCurrentGuestRecoveryKeySecret(),
  );
}

function getGuestRecoveryKeyHashCandidates(recoveryKey: string) {
  const currentSecret = getCurrentGuestRecoveryKeySecret();
  const legacySecrets = getLegacyGuestRecoveryKeySecrets();

  const hashes = [currentSecret, ...legacySecrets].map((secret) =>
    hashGuestRecoveryKeyWithSecret(recoveryKey, secret),
  );

  return Array.from(new Set(hashes));
}

function createGuestRecoveryKey() {
  return `pmkt_${randomBytes(18).toString("base64url")}`;
}

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      id: "guest",
      name: "Guest",
      credentials: {
        mode: { label: "Mode", type: "text" },
        recoveryKey: { label: "Recovery key", type: "text" },
      },
      async authorize(credentials): Promise<AuthorizeResult | null> {
        const mode = credentials?.mode;

        if (mode === "create") {
          const recoveryKey = createGuestRecoveryKey();
          const keyHash = getGuestRecoveryKeyHash(recoveryKey);

          const created = await prisma.$transaction(async (tx) => {
            const userRowCount = await tx.user.count();
            const guestSequence = String(userRowCount + 1).padStart(4, "0");

            const dbUser = await tx.user.create({
              data: {
                email: `guest+${randomUUID()}@guest.polipmarket.local`,
                name: `Vendég ${guestSequence}`,
                authType: "GUEST",
                guestKeyHash: keyHash,
                guestKeyAcknowledgedAt: null,
              },
              select: { id: true },
            });

            await tx.wallet.create({
              data: {
                userId: dbUser.id,
                balance: 1000,
              },
            });

            await evaluateAchievementsForUser({
              userId: dbUser.id,
              tx,
            });

            return dbUser;
          });

          return {
            id: created.id,
            guestRecoveryKey: recoveryKey,
          };
        }

        if (mode === "recover") {
          const recoveryKey = credentials?.recoveryKey?.trim();
          if (!recoveryKey?.startsWith("pmkt_")) {
            return null;
          }

          const keyHashCandidates = getGuestRecoveryKeyHashCandidates(recoveryKey);
          const dbUser = await prisma.user.findFirst({
            where: {
              authType: "GUEST",
              guestKeyHash: { in: keyHashCandidates },
              deletedAt: null,
            },
            select: { id: true, guestKeyHash: true },
          });

          if (!dbUser) {
            return null;
          }

          const currentKeyHash = keyHashCandidates[0];

          if (dbUser.guestKeyHash !== currentKeyHash) {
            await prisma.user.update({
              where: { id: dbUser.id },
              data: { guestKeyHash: currentKeyHash },
            });
          }

          return { id: dbUser.id };
        }

        return null;
      },
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
            authType: "GOOGLE",
            guestKeyHash: null,
            guestKeyAcknowledgedAt: null,
          },
          create: {
            id: userId,
            email: email!,
            name: user.name,
            image: user.image,
            authType: "GOOGLE",
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

    async jwt({ token, account, trigger, session, user }) {
      const appToken = token as AppToken;

      if (account?.provider === "google" && account.providerAccountId) {
        const googleId = account.providerAccountId;
        const legacyScopedGoogleId = getGoogleLegacyScopedId(googleId);

        const dbUser = await prisma.user.findFirst({
          where: {
            OR: [{ id: googleId }, { id: legacyScopedGoogleId }],
          },
          select: { id: true, sessionVersion: true, authType: true },
        });

        appToken.sub = dbUser?.id ?? googleId;
        appToken.sessionVersion = dbUser?.sessionVersion ?? 0;
        appToken.isGuest = dbUser?.authType === "GUEST";
        appToken.guestRecoveryKey = null;
      }

      if (account?.provider === "guest" && user?.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { sessionVersion: true, authType: true, guestKeyAcknowledgedAt: true },
        });

        appToken.sub = user.id;
        appToken.sessionVersion = dbUser?.sessionVersion ?? 0;
        appToken.isGuest = dbUser?.authType === "GUEST";
        appToken.guestRecoveryKey =
          "guestRecoveryKey" in user &&
          typeof user.guestRecoveryKey === "string" &&
          !dbUser?.guestKeyAcknowledgedAt
            ? user.guestRecoveryKey
            : null;
      }

      const updatedSession = (session ?? {}) as {
        impersonatedUserId?: string | null;
        guestRecoveryKey?: string | null;
      };

      if (trigger === "update" && updatedSession.impersonatedUserId !== undefined) {
        appToken.impersonatedUserId = updatedSession.impersonatedUserId ?? null;
      }

      if (trigger === "update" && updatedSession.guestRecoveryKey !== undefined) {
        appToken.guestRecoveryKey = updatedSession.guestRecoveryKey ?? null;
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
        sessionUser.isGuest = appToken.isGuest ?? false;
        sessionUser.guestRecoveryKey = appToken.guestRecoveryKey ?? null;
      }

      return session;
    },
  },
};
