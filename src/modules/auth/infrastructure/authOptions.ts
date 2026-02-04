import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

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
      // Google login → real user id
      if (account?.provider === "google") {
        token.sub = account.providerAccountId;
      }

      // Impersonation update
      if (trigger === "update" && session?.impersonatedUserId !== undefined) {
        token.impersonatedUserId = session.impersonatedUserId ?? null;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && typeof token.sub === "string") {
        const actingUserId = (token as any).impersonatedUserId ?? token.sub;

        (session.user as any).id = actingUserId;
        (session.user as any).impersonatedBy = (token as any).impersonatedUserId
          ? token.sub
          : null;
      }

      return session;
    },
  },
};

// import { AuthOptions } from "next-auth";
// import GoogleProvider from "next-auth/providers/google";
// import { prisma } from "@/lib/prisma";

// export const authOptions: AuthOptions = {
//   providers: [
//     GoogleProvider({
//       clientId: process.env.GOOGLE_CLIENT_ID!,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
//     }),
//   ],

//   session: {
//     strategy: "jwt",
//   },

//   callbacks: {
//     async signIn({ user, account }) {
//       if (account?.provider !== "google") return true;

//       const googleId = account.providerAccountId;
//       if (!googleId) return false;

//       const email = user.email ?? undefined;

//       await prisma.$transaction(async (tx) => {
//         // User upsert – balance már NEM létezik
//         const dbUser = await tx.user.upsert({
//           where: { id: googleId },
//           update: {
//             name: user.name,
//             image: user.image,
//             email,
//           },
//           create: {
//             id: googleId,
//             email: email!,
//             name: user.name,
//             image: user.image,
//           },
//         });

//         // Wallet létrehozás, ha nincs
//         await tx.wallet.upsert({
//           where: { userId: dbUser.id },
//           update: {},
//           create: {
//             userId: dbUser.id,
//             balance: 1000,
//           },
//         });
//       });

//       return true;
//     },

//     async jwt({ token, account }) {
//       if (account?.provider === "google") {
//         token.sub = account.providerAccountId;
//       }
//       return token;
//     },

//     async session({ session, token }) {
//       if (session.user && token.sub) {
//         session.user.id = token.sub;
//       }
//       return session;
//     },
//   },
// };
