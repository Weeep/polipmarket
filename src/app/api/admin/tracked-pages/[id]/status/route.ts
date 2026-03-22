import { NextResponse } from "next/server";
import { ensureAdmin } from "@/modules/auth/application/ensureAdmin";
import { TrackedPageStatus } from "@/modules/tracked-page/domain/TrackedPage";
import { updateTrackedPageStatus } from "@/modules/tracked-page/application/updateTrackedPageStatus";

function redirectForResult(kind: "success" | "error", message: string) {
  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: `/king?trackedPages=${kind}&message=${encodeURIComponent(message)}`,
    },
  });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  await ensureAdmin();

  try {
    const form = await req.formData();
    const rawStatus = String(form.get("status") ?? "").trim().toUpperCase();

    if (!Object.values(TrackedPageStatus).includes(rawStatus as TrackedPageStatus)) {
      throw new Error("Érvénytelen státusz.");
    }

    const { id } = await context.params;
    await updateTrackedPageStatus(id, rawStatus as TrackedPageStatus);

    return redirectForResult("success", "Az oldal státusza frissült.");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Ismeretlen hiba történt.";
    return redirectForResult("error", message);
  }
}
