import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ensureUser } from "@/modules/auth/application/ensureUser";

type AuthedHandler<TContext = any, TReq extends Request = Request> = (
  user: { id: string },
  req: TReq,
  context: TContext,
) => Promise<Response>;

export function withAuth<TContext = any, TReq extends Request = Request>(
  handler: AuthedHandler<TContext, TReq>,
) {
  return async (req: TReq, context: TContext) => {
    try {
      const user = await ensureUser();
      return await handler(user, req, context);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  };
}
