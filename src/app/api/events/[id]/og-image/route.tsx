import { ImageResponse } from "next/og";
import { getEventShareData } from "@/modules/event/application/getEventShareData";

export const runtime = "nodejs";

function truncateQuestion(question: string): string {
  if (question.length <= 84) {
    return question;
  }

  return `${question.slice(0, 81)}...`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const shareData = await getEventShareData(id);

  const title = shareData ? truncateQuestion(shareData.question) : "Esemény nem található";
  const category = shareData?.categoryLabel ?? "Polipmarket";
  const closeAt = shareData?.bettingCloseLabel ?? "Nincs elérhető eseményadat";
  const subtitle =
    shareData?.description ??
    "Fogadj a jövőre közösségi előrejelző piacon. Magyar nyelvű predikciós piactér.";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #09090b 0%, #18181b 50%, #09090b 100%)",
          color: "#f8fafc",
          padding: "52px 64px",
          fontFamily: "Inter, Segoe UI, Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            border: "1px solid rgba(251, 191, 36, 0.8)",
            borderRadius: "999px",
            fontSize: 28,
            padding: "10px 20px",
            color: "#fcd34d",
          }}
        >
          Polipmarket
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", fontSize: 28, color: "#cbd5e1" }}>{category}</div>
          <div
            style={{
              display: "flex",
              fontSize: 66,
              lineHeight: 1.08,
              fontWeight: 700,
              letterSpacing: -1.2,
              maxWidth: "100%",
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", fontSize: 32, color: "#e2e8f0", maxWidth: "100%" }}>
            {subtitle}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 26, color: "#94a3b8" }}>
            Fogadás zárása: {closeAt}
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#94a3b8" }}>polipmarket.hu</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
