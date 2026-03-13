import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { prisma } from "@/lib/prisma";

function parseNickname(input: unknown): string {
  if (typeof input !== "string") {
    throw new Error("A nickname kötelező.");
  }

  const normalized = input.trim();

  if (!normalized) {
    throw new Error("A nickname nem lehet üres.");
  }

  if (normalized.length > 40) {
    throw new Error("A nickname legfeljebb 40 karakter lehet.");
  }

  return normalized;
}

export const POST = withAuth(async (user, req) => {
  const body = (await req.json().catch(() => ({}))) as { nickname?: unknown };

  let nickname: string;

  try {
    nickname = parseNickname(body.nickname);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Érvénytelen nickname." },
      { status: 400 },
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { nickname: true, deletedAt: true },
  });

  if (!existingUser || existingUser.deletedAt) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (existingUser.nickname) {
    return NextResponse.json(
      { error: "A nickname már be van állítva, nem módosítható." },
      { status: 409 },
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { nickname },
  });

  return NextResponse.json({ ok: true, nickname });
});
