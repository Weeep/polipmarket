import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { acceptCurrentLegalDocuments } from "@/modules/legal/application/acceptCurrentLegalDocuments";

export const POST = withAuth(async (user, req) => {
  const body = (await req.json().catch(() => ({}))) as {
    acceptTerms?: boolean;
    acceptPrivacy?: boolean;
  };

  if (!body.acceptTerms || !body.acceptPrivacy) {
    return NextResponse.json(
      { error: "Mindkét dokumentum elfogadása kötelező." },
      { status: 400 },
    );
  }

  const userAgent = req.headers.get("user-agent");
  await acceptCurrentLegalDocuments(user.id, userAgent);

  return NextResponse.json({ ok: true });
});
