import { NextResponse } from "next/server";
import { ensureUser } from "@/modules/auth/application/ensureUser";
import { getMyBetLots } from "@/modules/event/application/getMyBetLots";

export async function GET(req: Request) {
  const user = await ensureUser();

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? "1000");

  const eventMarkets = await getMyBetLots(user.id, limit);
  return NextResponse.json(eventMarkets, {
    headers: {
      Deprecation: "true",
      Sunset: "Tue, 30 Jun 2026 00:00:00 GMT",
      Link: '</api/bets/my>; rel="successor-version"',
    },
  });
}
