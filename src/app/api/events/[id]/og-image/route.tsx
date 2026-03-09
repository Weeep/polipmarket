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

  const title = shareData
    ? truncateQuestion(shareData.question)
    : "Esemény nem található";
  const category = shareData?.categoryLabel ?? "Polipmarket";
  const closeAt = shareData?.bettingCloseLabel ?? "Nincs elérhető eseményadat";
  const marketPreviews = shareData?.marketPreviews ?? [];

  return new ImageResponse(
    <div
      style={{
        width: `${OUTPUT_WIDTH}px`,
        height: `${OUTPUT_HEIGHT}px`,
        overflow: "hidden",
        display: "flex",
        background: "#111",
        color: "#f5f5f4",
        fontFamily: "Inter, Segoe UI, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: `${RENDER_WIDTH}px`,
          height: `${RENDER_HEIGHT}px`,
          display: "flex",
          transform: `scale(${1 / RENDER_SCALE})`,
          transformOrigin: "top left",
          background: "#111",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            //borderRadius: "24px",
            //border: "1px solid rgba(251, 191, 36, 0.45)",
            padding: `${32 * RENDER_SCALE}px`,
            background: "#111", //"linear-gradient(180deg, #171717 0%, #121212 100%)",
            gap: `${18 * RENDER_SCALE}px`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              //borderRadius: "999px",
              //border: "1px solid rgba(251, 191, 36, 0.75)",
              color: "#fde68a",
              fontSize: 24 * RENDER_SCALE,
              fontWeight: 700,
              padding: `${6 * RENDER_SCALE}px ${14 * RENDER_SCALE}px`,
            }}
          >
            {category}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 52 * RENDER_SCALE,
              lineHeight: 1.08 * RENDER_SCALE,
              fontWeight: 700,
              letterSpacing: -0.8 * RENDER_SCALE,
              color: "#f5f5f4",
            }}
          >
            {title}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: `${12 * RENDER_SCALE}px`,
              marginTop: `${2 * RENDER_SCALE}px`,
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
                  //borderRadius: "14px",
                  //border: "1px solid rgba(245, 158, 11, 0.45)",
                  padding: `${12 * RENDER_SCALE}px ${14 * RENDER_SCALE}px`,
                  background: "rgba(24, 24, 27, 0.8)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 26 * RENDER_SCALE,
                    fontWeight: 600,
                    maxWidth: "124%",
                  }}
                >
                  {market.question}
                </div>
                <div style={{ display: "flex", gap: `${10 * RENDER_SCALE}px` }}>
                  <div
                    style={{
                      display: "flex",
                      //borderRadius: "10px",
                      //border: "1px solid rgba(96, 165, 250, 0.5)",
                      background: "rgba(30, 58, 138, 0.25)",
                      padding: `${10 * RENDER_SCALE}px ${14 * RENDER_SCALE}px`,
                      fontSize: 24 * RENDER_SCALE,
                      fontWeight: 700,
                      color: "#dbeafe",
                    }}
                  >
                    IGEN ({market.yesPriceLabel})
                  </div>
                  <div
                    style={{
                      display: "flex",
                      //borderRadius: "10px",
                      //border: "1px solid rgba(96, 165, 250, 0.5)",
                      background: "rgba(30, 58, 138, 0.25)",
                      padding: `${10 * RENDER_SCALE}px ${14 * RENDER_SCALE}px`,
                      fontSize: 24 * RENDER_SCALE,
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
              fontSize: 24 * RENDER_SCALE,
              color: "#d6d3d1",
              marginTop: "auto",
            }}
          >
            <div style={{ display: "flex" }}>Fogadás zár: {closeAt}</div>
            <div style={{ display: "flex", color: "#a8a29e" }}>
              polipmarket.hu
            </div>
          </div>
        </div>
      </div>
    </div>,
    {
      width: OUTPUT_WIDTH,
      height: OUTPUT_HEIGHT,
    },
  );
}
