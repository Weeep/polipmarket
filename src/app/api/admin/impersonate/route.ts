import { NextResponse } from "next/server";
import { ensureAdmin } from "@/modules/auth/application/ensureAdmin";

// This endpoint acts as a policy gate for impersonation: it authorizes and approves the target user,
// while the actual impersonation state change happens later via NextAuth session update and can be extended with extra rules.
export async function POST(req: Request) {
  await ensureAdmin();

  const { userId } = await req.json();

  return NextResponse.json({
    impersonatedUserId: userId,
  });
}
