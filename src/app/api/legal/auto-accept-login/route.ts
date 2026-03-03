import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { acceptCurrentLegalDocuments } from "@/modules/legal/application/acceptCurrentLegalDocuments";

const AUTO_ACCEPT_COOKIE_NAME = "pm_auto_legal_accept";

function getSafeNextPath(rawNext: string | null) {
  if (!rawNext || !rawNext.startsWith("/")) {
    return "/";
  }

  if (rawNext.startsWith("//")) {
    return "/";
  }

  return rawNext;
}

export const GET = withAuth(async (user, req) => {
  const url = new URL(req.url);
  const nextPath = getSafeNextPath(url.searchParams.get("next"));
  const shouldAutoAccept = req.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .includes(`${AUTO_ACCEPT_COOKIE_NAME}=1`);

  if (shouldAutoAccept) {
    await acceptCurrentLegalDocuments(user.id, req.headers.get("user-agent"));
  }

  const response = new NextResponse(null, {
    status: 303,
    headers: {
      Location: nextPath,
    },
  });
  response.cookies.set({
    name: AUTO_ACCEPT_COOKIE_NAME,
    value: "",
    maxAge: 0,
    path: "/",
    sameSite: "lax",
  });

  return response;
});
