import { NextResponse } from "next/server";
import { ensureUser } from "@/modules/auth/application/ensureUser";
import { getMyMarkets } from "@/modules/market/application/getMyMarkets";

export async function GET() {
  const user = await ensureUser();
  const markets = await getMyMarkets(user.id, 5);
  return NextResponse.json(markets);
}
