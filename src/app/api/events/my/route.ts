import { NextResponse } from "next/server";
import { ensureUser } from "@/modules/auth/application/ensureUser";
import { getMyBetLots } from "@/modules/event/application/getMyBetLots";

export async function GET() {
  const user = await ensureUser();
  const eventMarkets = await getMyBetLots(user.id, 5);
  return NextResponse.json(eventMarkets);
}
