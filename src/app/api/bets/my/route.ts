import { NextResponse } from "next/server";
import { ensureUser } from "@/modules/auth/application/ensureUser";
import { getMyBets } from "@/modules/event/application/getMyBets";

function parseStatus(value: string | null): "open" | "closed" | undefined {
  if (!value) return undefined;
  if (value === "open" || value === "closed") return value;
  return undefined;
}

export async function GET(req: Request) {
  try {
    const user = await ensureUser();

    const { searchParams } = new URL(req.url);
    const status = parseStatus(searchParams.get("status"));
    const limit = Number(searchParams.get("limit") ?? "50");
    const offset = Number(searchParams.get("offset") ?? "0");
    const eventId = searchParams.get("eventId") ?? undefined;

    if (searchParams.get("status") && !status) {
      return NextResponse.json(
        { error: "Invalid status. Use 'open' or 'closed'." },
        { status: 400 },
      );
    }

    const bets = await getMyBets({
      userId: user.id,
      status,
      limit: Number.isFinite(limit) ? limit : 50,
      offset: Number.isFinite(offset) ? offset : 0,
      eventId,
    });

    return NextResponse.json(bets);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
