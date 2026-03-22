import { NextResponse } from "next/server";
import { ensureAdmin } from "@/modules/auth/application/ensureAdmin";
import { createTrackedPage } from "@/modules/tracked-page/application/createTrackedPage";
import { buildCreateTrackedPageInput } from "@/modules/tracked-page/application/trackedPageInput";

function redirectForResult(kind: "success" | "error", message: string) {
  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: `/king?trackedPages=${kind}&message=${encodeURIComponent(message)}`,
    },
  });
}

export async function POST(req: Request) {
  await ensureAdmin();

  try {
    const form = await req.formData();
    const input = buildCreateTrackedPageInput({
      displayName: form.get("displayName"),
      sourceUrl: form.get("sourceUrl"),
      canonicalUrl: form.get("canonicalUrl"),
      country: form.get("country"),
      party: form.get("party"),
      role: form.get("role"),
      tags: form.get("tags"),
      scrapeNotes: form.get("scrapeNotes"),
      status: form.get("status"),
      scrapeEnabled: form.get("scrapeEnabled"),
      lastVerifiedAt: form.get("lastVerifiedAt"),
    });

    await createTrackedPage(input);
    return redirectForResult("success", "Az oldal sikeresen bekerült a regiszterbe.");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Ismeretlen hiba történt.";
    return redirectForResult("error", message);
  }
}
