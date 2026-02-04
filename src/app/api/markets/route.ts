import { NextResponse } from "next/server";
import { createMarket } from "@/modules/market/application/createMarket";
import { getMarkets } from "@/modules/market/application/getMarkets";

import { marketRepository } from "@/modules/market/infrastructure/marketRepository";
import { withAuth } from "@/lib/withAuth";

export const POST = withAuth<{ params: Promise<{ id: string }> }>(
  async (user, _req, { params }) => {
    try {
      const body = await _req.json();

      const market = await createMarket(marketRepository, {
        question: body.question,
        description: body.description,
        closeAt: new Date(body.closeAt),
        createdBy: user.id,
      });

      return NextResponse.json(market, { status: 201 });
    } catch (err: any) {
      return NextResponse.json(
        { error: err.message ?? "Bad request" },
        { status: 400 },
      );
    }
  },
);

// export async function POST(req: Request) {
//   try {
//     const session = await requireAuth();
//     const body = await req.json();

//     const market = await createMarket(marketRepository, {
//       question: body.question,
//       description: body.description,
//       closeAt: new Date(body.closeAt),
//       createdBy: session.user.id,
//     });

//     return NextResponse.json(market, { status: 201 });
//   } catch (err: any) {
//     return NextResponse.json(
//       { error: err.message ?? "Bad request" },
//       { status: 400 },
//     );
//   }
// }

export async function GET() {
  try {
    const markets = await getMarkets(marketRepository);
    return NextResponse.json(markets);
  } catch (error: any) {
    console.error("[GET /api/markets]", error);

    return NextResponse.json(
      { error: error.message ?? "Internal server error" },
      { status: 500 },
    );
  }
}
