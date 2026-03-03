import type { Metadata } from "next";
import "../../styles/globals.css";
import Providers from "../providers";
import { Header } from "@/components/Header";
import { MeProvider } from "@/context/MeContext";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { AchievementPopupQueue } from "@/components/AchievementPopupQueue";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/modules/auth/application/getSession";
import { getLegalAcceptanceStatus } from "@/modules/legal/application/getLegalAcceptanceStatus";
import { acceptCurrentLegalDocuments } from "@/modules/legal/application/acceptCurrentLegalDocuments";

export const metadata: Metadata = {
  metadataBase: new URL("https://polipmarket.hu"),
  title: "Polipmarket",
  description: "Fogadj a jövőre közösségi előrejelző piacon.",
  openGraph: {
    title: "Polipmarket",
    description: "Fogadj a jövőre közösségi előrejelző piacon.",
    url: "https://polipmarket.hu",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Polipmarket OG előnézeti kép",
      },
    ],
  },
};

async function enforceLegalGate() {
  const session = await getSession();

  if (!session?.user?.id) {
    return;
  }

  const cookieStore = await cookies();
  const shouldAutoAcceptFromLogin =
    cookieStore.get("pm_auto_legal_accept")?.value === "1";

  if (shouldAutoAcceptFromLogin) {
    await acceptCurrentLegalDocuments(session.user.id);
  }

  const status = await getLegalAcceptanceStatus(session.user.id);

  if (status.requiresAcceptance) {
    redirect("/legal/accept");
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await enforceLegalGate();

  return (
    <html lang="hu">
      <body className="bg-zinc-950 text-slate-900 min-h-screen">
        <Providers>
          <MeProvider>
            <Suspense fallback={null}>
              <Header />
            </Suspense>
            <AchievementPopupQueue />
            <div className="pb-20 md:pb-0">{children}</div>
            <footer className="border-t border-zinc-800 bg-zinc-950 px-4 pt-4 pb-24 text-center text-xs text-zinc-400 md:pb-4 md:text-sm">
              © {new Date().getFullYear()} Minden jog fenntartva · Contact:{" "}
              <a
                href="mailto:polipmarket@gmail.com"
                className="text-zinc-300 hover:text-white underline-offset-2 hover:underline"
              >
                polipmarket@gmail.com
              </a>
            </footer>
            <MobileBottomNav />
          </MeProvider>
        </Providers>
      </body>
    </html>
  );
}
