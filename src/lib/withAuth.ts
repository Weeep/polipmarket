import { NextResponse } from "next/server";
import { ensureUser } from "@/modules/auth/application/ensureUser";

type AuthedHandler<TContext = unknown, TReq extends Request = Request> = (
  user: { id: string },
  req: TReq,
  context: TContext,
) => Promise<Response>;

type MaybePromise<T> = T | Promise<T>;

function isPromise<T = unknown>(v: unknown): v is Promise<T> {
  return (
    !!v &&
    (typeof v === "object" || typeof v === "function") &&
    "then" in (v as any)
  );
}

export function withAuth<TContext = unknown, TReq extends Request = Request>(
  handler: AuthedHandler<TContext, TReq>,
) {
  return async (req: TReq, context: MaybePromise<TContext>) => {
    try {
      const user = await ensureUser();

      // 1) context lehet Promise (új Next.js viselkedés bizonyos esetekben)
      const ctx: any = isPromise(context) ? await context : context;

      // 2) ctx.params lehet Promise (sync dynamic APIs változás)
      if (ctx?.params && isPromise(ctx.params)) {
        ctx.params = await ctx.params;
      }

      return await handler(user, req, ctx as TContext);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  };
}
