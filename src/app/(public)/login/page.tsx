"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main>
      <header className="bg-zinc-800 text-white px-6 py-4 flex items-center">
        <Link href="/">
          <div className="font-semibold text-lg tracking-tight">
            Polipmarket
          </div>
        </Link>
      </header>
      {/* <div className="flex min-h-screen items-center justify-center"> */}
      <div className="flex py-10 justify-center">
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="button-gold"
        >
          Sign in with Google
        </button>
      </div>
    </main>
  );
}
