import { ImageResponse } from "next/og";
import { getEventShareData } from "@/modules/event/application/getEventShareData";

export const runtime = "nodejs";

const OUTPUT_WIDTH = 1200;
const OUTPUT_HEIGHT = 630;
const RENDER_SCALE = 2;
const RENDER_WIDTH = OUTPUT_WIDTH * RENDER_SCALE;
const RENDER_HEIGHT = OUTPUT_HEIGHT * RENDER_SCALE;

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
  const closeAt = shareData?.bettingCloseLabel ?? "Nincs elérhető eseményadat";
  const marketPreviews = shareData?.marketPreviews ?? [];
  const visibleMarkets = (marketPreviews.length > 0
    ? marketPreviews
    : [
        {
          id: "fallback",
          question: "Nincs aktív piac előnézet ehhez az eseményhez",
          yesPriceLabel: "—",
          noPriceLabel: "—",
        },
      ]
  ).slice(0, 2);

  return new ImageResponse(
    (
      <div
        style={{
          width: `${OUTPUT_WIDTH}px`,
          height: `${OUTPUT_HEIGHT}px`,
          overflow: "hidden",
          display: "flex",
          background: "#0f0f10",
          color: "#f5f5f4",
          fontFamily: "Inter, Segoe UI, Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: `${RENDER_WIDTH}px`,
            height: `${RENDER_HEIGHT}px`,
            display: "flex",
            flexDirection: "column",
            transform: `scale(${1 / RENDER_SCALE})`,
            transformOrigin: "top left",
            padding: "64px",
            background: "#0f0f10",
            gap: "36px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 102,
              lineHeight: 1.08,
              fontWeight: 700,
              letterSpacing: -1.2,
              color: "#f5f5f4",
            }}
          >
            {title}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              marginTop: "4px",
            }}
          >
            {visibleMarkets.map((market) => (
              <div
                key={market.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "20px 24px",
                  background: "#18181b",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 40,
                    fontWeight: 600,
                    maxWidth: "62%",
                    color: "#f5f5f4",
                  }}
                >
                  {market.question}
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <div
                    style={{
                      display: "flex",
                      background: "#1e3a8a",
                      padding: "16px 22px",
                      fontSize: 34,
                      fontWeight: 700,
                      color: "#dbeafe",
                    }}
                  >
                    IGEN ({market.yesPriceLabel})
                  </div>
                  <div
                    style={{
                      display: "flex",
                      background: "#1e3a8a",
                      padding: "16px 22px",
                      fontSize: 34,
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
              fontSize: 32,
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
      width: OUTPUT_WIDTH,
      height: OUTPUT_HEIGHT,
    },
  );
}
