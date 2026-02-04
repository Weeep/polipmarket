import { getMarketStats } from "@/modules/market/application/getMarketStats";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";

export const GET = async (
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;

    const stats = await getMarketStats(id);
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error("[GET /api/markets/[id]/stats]", error);

    return NextResponse.json(
      { error: error.message ?? "Internal server error" },
      { status: 500 },
    );
  }
};

// export const GET = withAuth<{ params: Promise<{ id: string }> }>(
//   async (user, _req, { params }) => {
//     const { id } = await params;

//     const data = await getSomething(user.id, id);
//     return Response.json(data);
//   }
// );

// export async function GET(
//   _req: Request,
//   { params }: { params: Promise<{ id: string }> },
// ) {
//   try {
//     const session = await requireAuth();

//     const user = await prisma.user.findUnique({
//       where: { id: session.user.id },
//       select: {
//         id: true,
//       },
//     });

//     if (!user) {
//       return NextResponse.json({ error: "User not found" }, { status: 404 });
//     }

//     const { id } = await params;

//     const stats = await getMarketStats(id, user.id);
//     return NextResponse.json(stats);
//   } catch (error: any) {
//     console.error("[GET /api/markets/[id]/stats]", error);

//     return NextResponse.json(
//       { error: error.message ?? "Internal server error" },
//       { status: 500 },
//     );
//   }
// }
