import { NextResponse } from "next/server";
import { ensureUser } from "@/modules/auth/application/ensureUser";
import { getMyEventMarkets } from "@/modules/event/application/getMyEventMarkets";

export async function GET() {
  const user = await ensureUser();
  const eventMarkets = await getMyEventMarkets(user.id, 5);
  return NextResponse.json(eventMarkets);
}
