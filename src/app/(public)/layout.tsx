import type { Metadata } from "next";
import "../../styles/globals.css";
import Providers from "../providers";
import { Header } from "@/components/Header";
import { MeProvider } from "@/context/MeContext";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { AchievementPopupQueue } from "@/components/AchievementPopupQueue";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Polipmarket",
  description: "A play-money marketplace for predicting real-world events.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
            <MobileBottomNav />
          </MeProvider>
        </Providers>
      </body>
    </html>
  );
}
