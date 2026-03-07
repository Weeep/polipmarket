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
  const marketPreviews = shareData?.marketPreviews ?? [];

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          background: "#0f0f10",
          padding: "24px",
          color: "#f5f5f4",
          fontFamily: "Inter, Segoe UI, Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            borderRadius: "24px",
            border: "1px solid rgba(251, 191, 36, 0.45)",
            padding: "32px",
            background: "linear-gradient(180deg, #171717 0%, #121212 100%)",
            gap: "18px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              borderRadius: "999px",
              border: "1px solid rgba(251, 191, 36, 0.75)",
              color: "#fde68a",
              fontSize: 24,
              fontWeight: 700,
              padding: "6px 14px",
            }}
          >
            {category}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 52,
              lineHeight: 1.08,
              fontWeight: 700,
              letterSpacing: -0.8,
              color: "#f5f5f4",
            }}
          >
            {title}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              marginTop: "2px",
            }}
          >
            {(marketPreviews.length > 0
              ? marketPreviews
              : [
                  {
                    id: "fallback",
                    question: "Nincs aktív piac előnézet ehhez az eseményhez",
                    yesPriceLabel: "—",
                    noPriceLabel: "—",
                  },
                ]
            ).map((market) => (
              <div
                key={market.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderRadius: "14px",
                  border: "1px solid rgba(245, 158, 11, 0.45)",
                  padding: "12px 14px",
                  background: "rgba(24, 24, 27, 0.8)",
                }}
              >
                <div style={{ display: "flex", fontSize: 26, fontWeight: 600, maxWidth: "62%" }}>
                  {market.question}
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <div
                    style={{
                      display: "flex",
                      borderRadius: "10px",
                      border: "1px solid rgba(96, 165, 250, 0.5)",
                      background: "rgba(30, 58, 138, 0.25)",
                      padding: "10px 14px",
                      fontSize: 24,
                      fontWeight: 700,
                      color: "#dbeafe",
                    }}
                  >
                    IGEN ({market.yesPriceLabel})
                  </div>
                  <div
                    style={{
                      display: "flex",
                      borderRadius: "10px",
                      border: "1px solid rgba(96, 165, 250, 0.5)",
                      background: "rgba(30, 58, 138, 0.25)",
                      padding: "10px 14px",
                      fontSize: 24,
                      fontWeight: 700,
                      color: "#dbeafe",
                    }}
                  >
                    NEM ({market.noPriceLabel})
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 24,
              color: "#d6d3d1",
              marginTop: "auto",
            }}
          >
            <div style={{ display: "flex" }}>Fogadás zár: {closeAt}</div>
            <div style={{ display: "flex", color: "#a8a29e" }}>polipmarket.hu</div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
