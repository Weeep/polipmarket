import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { ensureAdmin } from "@/modules/auth/application/ensureAdmin";
import { approveMarket } from "@/modules/market/application/approveMarket";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export const POST = withAuth(async (_user, _req, context) => {
  try {
    await ensureAdmin();
    const { params } = context as { params: { id: string } };
    const { id } = params;
    const market = await approveMarket(id);
    return NextResponse.json(market);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to approve market") },
      { status: 400 },
    );
  }
});
