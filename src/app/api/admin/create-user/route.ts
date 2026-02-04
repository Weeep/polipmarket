import { NextResponse } from "next/server";
import { ensureAdmin } from "@/modules/auth/application/ensureAdmin";
import { createFakeUser } from "@/modules/user/application/createFakeUser";

export async function POST(req: Request) {
  await ensureAdmin();

  const form = await req.formData();

  const email = String(form.get("email"));
  const name = form.get("name")?.toString();

  await createFakeUser({ email, name });

  return NextResponse.redirect(new URL("/king", req.url));
}
