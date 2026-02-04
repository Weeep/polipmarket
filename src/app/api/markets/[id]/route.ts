import { NextResponse } from "next/server";
import { getMarketById } from "@/modules/market/application/getMarkets";
import { marketRepository } from "@/modules/market/infrastructure/marketRepository";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const market = await getMarketById(marketRepository, id);

    if (!market) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }

    return NextResponse.json(market);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
