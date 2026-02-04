import { NextResponse } from "next/server";
import { ensureAdmin } from "@/modules/auth/application/ensureAdmin";

export async function POST() {
  await ensureAdmin();

  return NextResponse.json({
    impersonatedUserId: null,
  });
}
